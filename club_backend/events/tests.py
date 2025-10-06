
import os
import tempfile
from django.test import TestCase, TransactionTestCase
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import transaction, IntegrityError
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch, Mock, MagicMock
from PIL import Image
from io import BytesIO
import json

from events.models import Event, EventRegistration, EventReport
from events.serializers import (
    EventSerializer, EventListSerializer, EventDetailSerializer,
    EventRegistrationSerializer, EventReportSerializer,
    BulkAttendanceUpdateSerializer
)
from events.permissions import EventPermission, EventReportPermission
from clubs.models import Club
from users.models import CustomUser  # Adjust import based on your user model


class BaseEventTestCase(TestCase):
    """Base test case with common setup for events"""

    @classmethod
    def setUpTestData(cls):
        """Create groups once for all tests to avoid conflicts"""
        cls.superadmin_group, _ = Group.objects.get_or_create(name='Superadmin')
        cls.ambassador_group, _ = Group.objects.get_or_create(name='Ambassador')
        cls.volunteer_group, _ = Group.objects.get_or_create(name='Volunteer')
        cls.member_group, _ = Group.objects.get_or_create(name='Member')
        cls.registered_group, _ = Group.objects.get_or_create(name='Registered')

    def setUp(self):
        # Create users
        self.superadmin = CustomUser.objects.create_user(
            username='superadmin_events',
            email='superadmin_events@test.com',
            password='password123',
            university='Test University'
        )
        self.ambassador = CustomUser.objects.create_user(
            username='ambassador_events',
            email='ambassador_events@test.com',
            password='password123',
            university='Test University'
        )
        self.volunteer = CustomUser.objects.create_user(
            username='volunteer_events',
            email='volunteer_events@test.com',
            password='password123',
            university='Test University'
        )
        self.regular_user = CustomUser.objects.create_user(
            username='regular_events',
            email='regular_events@test.com',
            password='password123',
            university='Test University'
        )

        # Assign users to groups
        self.superadmin.groups.add(self.superadmin_group)
        self.ambassador.groups.add(self.ambassador_group)
        self.volunteer.groups.add(self.volunteer_group)
        self.regular_user.groups.add(self.member_group)

        # Create club
        self.club = Club.objects.create(
            name='Events Test Club',
            university='Test University',
            admin=self.ambassador
        )

        # Add volunteer to club
        self.club.members.add(self.volunteer)
        if hasattr(self.volunteer, 'club'):
            self.volunteer.club = self.club
            self.volunteer.save()

        # Create past and future dates
        self.past_date = timezone.now() - timedelta(days=7)
        self.future_date = timezone.now() + timedelta(days=7)


class EventModelTest(BaseEventTestCase):
    """Test cases for Event model"""

    def test_event_creation(self):
        """Test basic event creation"""
        event = Event.objects.create(
            title='Test Event',
            description='Test description',
            club=self.club,
            tag=Event.EventTag.DISCUSSION,
            date=self.future_date,
            created_by=self.volunteer
        )

        self.assertEqual(event.title, 'Test Event')
        self.assertEqual(event.description, 'Test description')
        self.assertEqual(event.club, self.club)
        self.assertEqual(event.tag, Event.EventTag.DISCUSSION)
        self.assertEqual(event.created_by, self.volunteer)
        self.assertTrue(event.created_at)

    def test_event_str_representation(self):
        """Test __str__ method"""
        event = Event.objects.create(
            title='Test Event',
            club=self.club,
            tag=Event.EventTag.HACKATHON,
            created_by=self.volunteer
        )
        self.assertEqual(str(event), 'Test Event (Hackathon)')

    def test_event_tag_choices(self):
        """Test event tag choices"""
        event = Event.objects.create(
            title='Workshop Event',
            club=self.club,
            tag=Event.EventTag.WORKSHOP,
            created_by=self.volunteer
        )
        self.assertEqual(event.tag, 'workshop')
        self.assertEqual(event.get_tag_display(), 'Workshop')


class EventRegistrationModelTest(BaseEventTestCase):
    """Test cases for EventRegistration model"""

    def setUp(self):
        super().setUp()
        self.event = Event.objects.create(
            title='Registration Test Event',
            club=self.club,
            date=self.future_date,
            created_by=self.volunteer
        )

    def test_registration_creation(self):
        """Test basic registration creation"""
        registration = EventRegistration.objects.create(
            event=self.event,
            user=self.regular_user
        )

        self.assertEqual(registration.event, self.event)
        self.assertEqual(registration.user, self.regular_user)
        self.assertFalse(registration.attended)  # Default value
        self.assertTrue(registration.created_at)

    def test_unique_together_constraint(self):
        """Test unique constraint for event and user"""
        EventRegistration.objects.create(
            event=self.event,
            user=self.regular_user
        )

        # Creating another registration with same event and user should fail
        with self.assertRaises(IntegrityError):
            EventRegistration.objects.create(
                event=self.event,
                user=self.regular_user
            )


class EventReportModelTest(BaseEventTestCase):
    """Test cases for EventReport model"""

    def setUp(self):
        super().setUp()
        self.past_event = Event.objects.create(
            title='Past Event',
            club=self.club,
            date=self.past_date,
            created_by=self.volunteer
        )

        # Create some registrations with attendance
        self.reg1 = EventRegistration.objects.create(
            event=self.past_event,
            user=self.regular_user,
            attended=True
        )
        self.reg2 = EventRegistration.objects.create(
            event=self.past_event,
            user=self.ambassador,
            attended=False
        )

    def test_report_creation(self):
        """Test basic report creation"""
        report = EventReport.objects.create(
            event=self.past_event,
            submitted_by=self.volunteer,
            participants_attended=1,
            summary='Test event went well with good participation.'
        )

        self.assertEqual(report.event, self.past_event)
        self.assertEqual(report.submitted_by, self.volunteer)
        self.assertEqual(report.participants_attended, 1)
        self.assertTrue(report.submitted_at)

    def test_calculate_attendance_method(self):
        """Test calculate_attendance method"""
        report = EventReport.objects.create(
            event=self.past_event,
            submitted_by=self.volunteer,
            participants_attended=0,  # Will be overridden by save method
            summary='Test summary'
        )

        # Method should return count of attended registrations
        self.assertEqual(report.calculate_attendance(), 1)

    def test_auto_calculation_on_save(self):
        """Test automatic attendance calculation on save"""
        report = EventReport.objects.create(
            event=self.past_event,
            submitted_by=self.volunteer,
            summary='Test summary'
        )

        # participants_attended should be automatically calculated
        self.assertEqual(report.participants_attended, 1)


class EventSerializerTest(BaseEventTestCase):
    """Test cases for Event serializers"""

    def test_event_serializer_valid_data(self):
        """Test EventSerializer with valid data"""
        data = {
            'title': 'Test Event',
            'description': 'Test description',
            'club': self.club.id,
            'tag': Event.EventTag.DISCUSSION,
            'date': self.future_date.isoformat()
        }

        context = {'request': Mock(user=self.volunteer)}
        serializer = EventSerializer(data=data, context=context)
        self.assertTrue(serializer.is_valid())

    def test_event_serializer_title_validation(self):
        """Test title validation"""
        # Test empty title
        data = {
            'title': '',
            'club': self.club.id,
            'tag': Event.EventTag.DISCUSSION
        }

        context = {'request': Mock(user=self.volunteer)}
        serializer = EventSerializer(data=data, context=context)
        self.assertFalse(serializer.is_valid())
        self.assertIn('title', serializer.errors)

        # Test short title
        data['title'] = 'AB'
        serializer = EventSerializer(data=data, context=context)
        self.assertFalse(serializer.is_valid())
        self.assertIn('title', serializer.errors)

    def test_event_serializer_past_date_validation(self):
        """Test validation for past dates"""
        data = {
            'title': 'Past Event',
            'club': self.club.id,
            'tag': Event.EventTag.DISCUSSION,
            'date': self.past_date.isoformat()
        }

        context = {'request': Mock(user=self.volunteer)}
        serializer = EventSerializer(data=data, context=context)
        self.assertFalse(serializer.is_valid())
        self.assertIn('date', serializer.errors)

    def test_event_registration_serializer_duplicate_validation(self):
        """Test duplicate registration validation"""
        event = Event.objects.create(
            title='Registration Test',
            club=self.club,
            date=self.future_date,
            created_by=self.volunteer
        )

        # Create first registration
        EventRegistration.objects.create(event=event, user=self.regular_user)

        # Try to create duplicate
        data = {'event': event.id}
        context = {'request': Mock(user=self.regular_user)}
        serializer = EventRegistrationSerializer(data=data, context=context)

        self.assertFalse(serializer.is_valid())
        self.assertIn('event', serializer.errors)

    def test_event_report_serializer_future_event_validation(self):
        """Test report creation for future events"""
        future_event = Event.objects.create(
            title='Future Event',
            club=self.club,
            date=self.future_date,
            created_by=self.volunteer
        )

        data = {
            'event': future_event.id,
            'summary': 'This should not be allowed'
        }

        context = {'request': Mock(user=self.volunteer)}
        serializer = EventReportSerializer(data=data, context=context)
        self.assertFalse(serializer.is_valid())
        self.assertIn('event', serializer.errors)


class EventPermissionTest(BaseEventTestCase):
    """Test cases for EventPermission"""

    def setUp(self):
        super().setUp()
        self.permission = EventPermission()
        self.event = Event.objects.create(
            title='Permission Test Event',
            club=self.club,
            date=self.future_date,
            created_by=self.volunteer
        )

    def test_has_permission_unauthenticated(self):
        """Test permission for unauthenticated user"""
        request = Mock(user=Mock(is_authenticated=False))
        view = Mock(action='list')

        result = self.permission.has_permission(request, view)
        self.assertFalse(result)

    def test_has_permission_list_retrieve(self):
        """Test permission for list and retrieve actions"""
        request = Mock(user=self.regular_user)

        # Test list action
        view = Mock(action='list')
        result = self.permission.has_permission(request, view)
        self.assertTrue(result)

        # Test retrieve action
        view = Mock(action='retrieve')
        result = self.permission.has_permission(request, view)
        self.assertTrue(result)

    @patch.object(EventPermission, 'check_permission')
    def test_has_permission_create(self, mock_check_permission):
        """Test permission for create action"""
        mock_check_permission.return_value = True

        request = Mock(user=self.volunteer)
        view = Mock(action='create')

        result = self.permission.has_permission(request, view)
        self.assertTrue(result)

    def test_has_object_permission_retrieve(self):
        """Test object permission for retrieve action"""
        request = Mock(user=self.regular_user)
        view = Mock(action='retrieve')

        result = self.permission.has_object_permission(request, view, self.event)
        self.assertTrue(result)

    @patch.object(EventPermission, 'check_permission')
    def test_has_object_permission_update(self, mock_check_permission):
        """Test object permission for update action"""
        mock_check_permission.return_value = True

        request = Mock(user=self.volunteer)
        view = Mock(action='update')

        result = self.permission.has_object_permission(request, view, self.event)
        self.assertTrue(result)


class EventReportPermissionTest(BaseEventTestCase):
    """Test cases for EventReportPermission"""

    def setUp(self):
        super().setUp()
        self.permission = EventReportPermission()
        self.past_event = Event.objects.create(
            title='Report Permission Test',
            club=self.club,
            date=self.past_date,
            created_by=self.volunteer
        )
        self.report = EventReport.objects.create(
            event=self.past_event,
            submitted_by=self.volunteer,
            summary='Test report'
        )

    def test_has_permission_unauthenticated(self):
        """Test permission for unauthenticated user"""
        request = Mock(user=Mock(is_authenticated=False))
        view = Mock()

        result = self.permission.has_permission(request, view)
        self.assertFalse(result)

    def test_has_permission_create_volunteer(self):
        """Test create permission for volunteer"""
        request = Mock(user=self.volunteer)
        view = Mock(action='create')

        result = self.permission.has_permission(request, view)
        self.assertTrue(result)

    def test_has_object_permission_retrieve_creator(self):
        """Test retrieve permission for event creator"""
        request = Mock(user=self.volunteer)
        view = Mock(action='retrieve')

        result = self.permission.has_object_permission(request, view, self.report)
        self.assertTrue(result)


class EventAPITest(APITestCase):
    """Test cases for Event API endpoints"""

    def setUp(self):
        self.client = APIClient()

        # Create users
        self.superadmin = CustomUser.objects.create_user(
            username='api_superadmin_events',
            email='api_superadmin_events@test.com',
            password='password123',
            university='Test University'
        )

        self.volunteer = CustomUser.objects.create_user(
            username='api_volunteer_events',
            email='api_volunteer_events@test.com',
            password='password123',
            university='Test University'
        )

        self.regular_user = CustomUser.objects.create_user(
            username='api_regular_events',
            email='api_regular_events@test.com',
            password='password123',
            university='Test University'
        )

        # Create club
        self.club = Club.objects.create(
            name='API Events Test Club',
            university='Test University'
        )

        # Add volunteer to club
        self.club.members.add(self.volunteer)
        if hasattr(self.volunteer, 'club'):
            self.volunteer.club = self.club
            self.volunteer.save()

        # Create test events
        self.future_date = timezone.now() + timedelta(days=7)
        self.past_date = timezone.now() - timedelta(days=7)

        self.event = Event.objects.create(
            title='API Test Event',
            description='Test description',
            club=self.club,
            tag=Event.EventTag.DISCUSSION,
            date=self.future_date,
            created_by=self.volunteer
        )

    def test_list_events_unauthenticated(self):
        """Test listing events without authentication"""
        response = self.client.get('/api/events/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_events_authenticated(self):
        """Test listing events with authentication"""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/events/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_event(self):
        """Test retrieving specific event"""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(f'/api/events/{self.event.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], self.event.title)

    @patch('events.permissions.EventPermission.check_permission')
    def test_create_event_with_permission(self, mock_check_permission):
        """Test creating event with proper permissions"""
        mock_check_permission.return_value = True

        self.client.force_authenticate(user=self.volunteer)

        data = {
            'title': 'New API Event',
            'description': 'New event description',
            'club': self.club.id,
            'tag': Event.EventTag.WORKSHOP,
            'date': self.future_date.isoformat()
        }

        response = self.client.post('/api/events/', data=data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify event was created
        self.assertTrue(
            Event.objects.filter(title='New API Event').exists()
        )

    def test_create_event_without_permission(self):
        """Test creating event without proper permissions"""
        self.client.force_authenticate(user=self.regular_user)

        data = {
            'title': 'Unauthorized Event',
            'club': self.club.id,
            'tag': Event.EventTag.DISCUSSION
        }

        response = self.client.post('/api/events/', data=data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_register_for_event(self):
        """Test user registration for event"""
        self.client.force_authenticate(user=self.regular_user)

        response = self.client.post(f'/api/events/{self.event.id}/register/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify registration was created
        self.assertTrue(
            EventRegistration.objects.filter(
                event=self.event,
                user=self.regular_user
            ).exists()
        )

    def test_register_for_past_event(self):
        """Test registration for past event should fail"""
        past_event = Event.objects.create(
            title='Past Event',
            club=self.club,
            date=self.past_date,
            created_by=self.volunteer
        )

        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(f'/api/events/{past_event.id}/register/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_registration(self):
        """Test duplicate registration should fail"""
        # Create first registration
        EventRegistration.objects.create(
            event=self.event,
            user=self.regular_user
        )

        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(f'/api/events/{self.event.id}/register/')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unregister_from_event(self):
        """Test unregistering from event"""
        # Create registration first
        EventRegistration.objects.create(
            event=self.event,
            user=self.regular_user
        )

        self.client.force_authenticate(user=self.regular_user)
        response = self.client.delete(f'/api/events/{self.event.id}/unregister/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify registration was removed
        self.assertFalse(
            EventRegistration.objects.filter(
                event=self.event,
                user=self.regular_user
            ).exists()
        )

    @patch('events.permissions.EventPermission.has_object_permission')
    def test_get_event_registrations(self, mock_permission):
        """Test getting event registrations (admin only)"""
        mock_permission.return_value = True

        # Create some registrations
        EventRegistration.objects.create(event=self.event, user=self.regular_user)
        EventRegistration.objects.create(event=self.event, user=self.volunteer)

        self.client.force_authenticate(user=self.volunteer)
        response = self.client.get(f'/api/events/{self.event.id}/registrations/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    @patch('events.permissions.EventPermission.has_object_permission')
    def test_update_attendance(self, mock_permission):
        """Test bulk attendance update"""
        mock_permission.return_value = True

        # Create registrations
        reg1 = EventRegistration.objects.create(event=self.event, user=self.regular_user)
        reg2 = EventRegistration.objects.create(event=self.event, user=self.volunteer)

        self.client.force_authenticate(user=self.volunteer)

        data = {
            'registrations': {
                str(reg1.id): 'true',
                str(reg2.id): 'false'
            }
        }

        response = self.client.post(
            f'/api/events/{self.event.id}/attendance/',
            data=data,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify attendance was updated
        reg1.refresh_from_db()
        reg2.refresh_from_db()
        self.assertTrue(reg1.attended)
        self.assertFalse(reg2.attended)

    @patch('events.permissions.EventPermission.has_object_permission')
    def test_get_event_statistics(self, mock_permission):
        """Test getting event statistics"""
        mock_permission.return_value = True

        # Create registrations with attendance
        EventRegistration.objects.create(
            event=self.event, user=self.regular_user, attended=True
        )
        EventRegistration.objects.create(
            event=self.event, user=self.volunteer, attended=False
        )

        self.client.force_authenticate(user=self.volunteer)
        response = self.client.get(f'/api/events/{self.event.id}/statistics/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_registrations'], 2)
        self.assertEqual(response.data['attended_count'], 1)
        self.assertEqual(response.data['attendance_rate'], 50.0)


class EventReportAPITest(APITestCase):
    """Test cases for Event Report API endpoints"""

    def setUp(self):
        self.client = APIClient()

        # Create users
        self.volunteer = CustomUser.objects.create_user(
            username='report_volunteer',
            email='report_volunteer@test.com',
            password='password123',
            university='Test University'
        )

        self.regular_user = CustomUser.objects.create_user(
            username='report_regular',
            email='report_regular@test.com',
            password='password123',
            university='Test University'
        )

        # Create club
        self.club = Club.objects.create(
            name='Report Test Club',
            university='Test University'
        )

        # Create past event
        self.past_date = timezone.now() - timedelta(days=7)
        self.past_event = Event.objects.create(
            title='Past Event for Report',
            club=self.club,
            date=self.past_date,
            created_by=self.volunteer
        )

        # Create registrations with attendance
        EventRegistration.objects.create(
            event=self.past_event, user=self.regular_user, attended=True
        )

    @patch('events.permissions.EventReportPermission.has_permission')
    def test_create_report(self, mock_permission):
        """Test creating event report"""
        mock_permission.return_value = True

        self.client.force_authenticate(user=self.volunteer)

        data = {
            'event': self.past_event.id,
            'summary': 'Event went very well with good participation and engagement from attendees.'
        }

        response = self.client.post('/api/reports/', data=data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify report was created
        self.assertTrue(
            EventReport.objects.filter(event=self.past_event).exists()
        )

    def test_create_report_for_future_event(self):
        """Test creating report for future event should fail"""
        future_date = timezone.now() + timedelta(days=7)
        future_event = Event.objects.create(
            title='Future Event',
            club=self.club,
            date=future_date,
            created_by=self.volunteer
        )

        self.client.force_authenticate(user=self.volunteer)

        data = {
            'event': future_event.id,
            'summary': 'This should fail'
        }

        # Mock permission but validation should still fail
        with patch('events.permissions.EventReportPermission.has_permission', return_value=True):
            response = self.client.post('/api/reports/', data=data)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class EventPerformanceTest(TransactionTestCase):
    """Performance tests for events operations"""

    def setUp(self):
        self.volunteer = CustomUser.objects.create_user(
            username='perf_volunteer',
            email='perf_volunteer@test.com',
            password='password123',
            university='Test University'
        )

        self.club = Club.objects.create(
            name='Performance Test Club',
            university='Test University'
        )

    def test_bulk_event_creation_performance(self):
        """Test performance of creating multiple events"""
        import time

        start_time = time.time()

        events = []
        future_date = timezone.now() + timedelta(days=7)

        for i in range(50):
            events.append(Event(
                title=f'Performance Test Event {i}',
                description=f'Description for event {i}',
                club=self.club,
                tag=Event.EventTag.DISCUSSION,
                date=future_date,
                created_by=self.volunteer
            ))

        Event.objects.bulk_create(events)

        end_time = time.time()
        duration = end_time - start_time

        # Should create 50 events in less than 2 seconds
        self.assertLess(duration, 2.0)

        # Verify all events were created
        created_count = Event.objects.filter(title__startswith='Performance Test Event').count()
        self.assertEqual(created_count, 50)

    def test_bulk_registration_performance(self):
        """Test performance of bulk registrations"""
        import time

        # Create event
        future_date = timezone.now() + timedelta(days=7)
        event = Event.objects.create(
            title='Bulk Registration Test',
            club=self.club,
            date=future_date,
            created_by=self.volunteer
        )

        # Create multiple users
        users = []
        for i in range(30):
            user = CustomUser.objects.create_user(
                username=f'perf_user{i}',
                email=f'perf_user{i}@test.com',
                password='password123',
                university='Test University'
            )
            users.append(user)

        # Create registrations
        start_time = time.time()

        registrations = []
        for user in users:
            registrations.append(EventRegistration(
                event=event,
                user=user
            ))

        EventRegistration.objects.bulk_create(registrations)

        end_time = time.time()
        duration = end_time - start_time

        # Should create 30 registrations in reasonable time
        self.assertLess(duration, 5.0)

        # Verify all registrations were created
        self.assertEqual(
            EventRegistration.objects.filter(event=event).count(),
            30
        )


class EventBusinessLogicTest(BaseEventTestCase):
    """Test cases for complex business logic and workflows"""

    def test_complete_event_lifecycle(self):
        """Test complete event lifecycle from creation to report"""
        # 1. Create event
        future_date = timezone.now() + timedelta(days=1)
        event = Event.objects.create(
            title='Lifecycle Test Event',
            club=self.club,
            date=future_date,
            created_by=self.volunteer
        )

        # 2. Users register
        reg1 = EventRegistration.objects.create(event=event, user=self.regular_user)
        reg2 = EventRegistration.objects.create(event=event, user=self.ambassador)

        # 3. Event "happens" (simulate by moving date to past)
        event.date = timezone.now() - timedelta(hours=1)
        event.save()

        # 4. Mark attendance
        reg1.attended = True
        reg1.save()
        reg2.attended = False
        reg2.save()

        # 5. Create report
        report = EventReport.objects.create(
            event=event,
            submitted_by=self.volunteer,
            summary='Event completed successfully with good attendance.'
        )

        # Verify final state
        self.assertEqual(event.registrations.count(), 2)
        self.assertEqual(event.registrations.filter(attended=True).count(), 1)
        self.assertEqual(report.participants_attended, 1)
        self.assertEqual(report.calculate_attendance(), 1)

    def test_registration_validation_business_rules(self):
        """Test business rules for event registration"""
        # Create past event
        past_event = Event.objects.create(
            title='Past Event',
            club=self.club,
            date=self.past_date,
            created_by=self.volunteer
        )

        # Should not be able to register for past events
        with self.assertRaises(Exception):
            # This would be caught by serializer validation
            EventRegistration.objects.create(
                event=past_event,
                user=self.regular_user
            )

    def test_report_duplicate_prevention(self):
        """Test that duplicate reports are prevented"""
        past_event = Event.objects.create(
            title='Report Duplicate Test',
            club=self.club,
            date=self.past_date,
            created_by=self.volunteer
        )

        # Create first report
        EventReport.objects.create(
            event=past_event,
            submitted_by=self.volunteer,
            summary='First report'
        )

        # Try to create second report for same event
        with self.assertRaises(IntegrityError):
            EventReport.objects.create(
                event=past_event,
                submitted_by=self.volunteer,
                summary='Duplicate report'
            )


class EventIntegrationTest(APITestCase):
    """Integration tests for complete workflows"""

    def setUp(self):
        self.client = APIClient()

        # Create complete user hierarchy
        self.volunteer = CustomUser.objects.create_user(
            username='integration_volunteer',
            email='integration_volunteer@test.com',
            password='password123',
            university='Test University'
        )

        self.regular_user = CustomUser.objects.create_user(
            username='integration_regular',
            email='integration_regular@test.com',
            password='password123',
            university='Test University'
        )

        # Create club
        self.club = Club.objects.create(
            name='Integration Test Club',
            university='Test University'
        )

        self.club.members.add(self.volunteer)
        if hasattr(self.volunteer, 'club'):
            self.volunteer.club = self.club
            self.volunteer.save()

    @patch('events.permissions.EventPermission.check_permission')
    def test_complete_event_workflow(self, mock_check_permission):
        """Test complete event workflow from creation to report"""
        mock_check_permission.return_value = True

        future_date = timezone.now() + timedelta(days=1)

        # Step 1: Volunteer creates event
        self.client.force_authenticate(user=self.volunteer)

        event_data = {
            'title': 'Integration Test Event',
            'description': 'Complete workflow test',
            'club': self.club.id,
            'tag': Event.EventTag.WORKSHOP,
            'date': future_date.isoformat()
        }

        response = self.client.post('/api/events/', data=event_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        event_id = response.data['id']

        # Step 2: Regular user registers for event
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post(f'/api/events/{event_id}/register/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Step 3: Volunteer registers too
        self.client.force_authenticate(user=self.volunteer)
        response = self.client.post(f'/api/events/{event_id}/register/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Step 4: "Event happens" - simulate by updating date
        event = Event.objects.get(id=event_id)
        event.date = timezone.now() - timedelta(hours=1)
        event.save()

        # Step 5: Mark attendance (volunteer marks attendance)
        with patch('events.permissions.EventPermission.has_object_permission', return_value=True):
            registrations = EventRegistration.objects.filter(event=event)
            attendance_data = {
                'registrations': {
                    str(registrations[0].id): 'true',
                    str(registrations[1].id): 'false'
                }
            }

            response = self.client.post(
                f'/api/events/{event_id}/attendance/',
                data=attendance_data,
                format='json'
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Step 6: Create report
        with patch('events.permissions.EventReportPermission.has_permission', return_value=True):
            report_data = {
                'event': event_id,
                'summary': 'Integration test event completed successfully with good participation.'
            }

            response = self.client.post('/api/reports/', data=report_data)
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify final state
        event.refresh_from_db()
        self.assertEqual(event.registrations.count(), 2)
        self.assertEqual(event.registrations.filter(attended=True).count(), 1)
        self.assertTrue(hasattr(event, 'reports'))


if __name__ == '__main__':
    import django
    from django.conf import settings
    from django.test.utils import get_runner

    if not settings.configured:
        settings.configure(
            DEBUG=True,
            DATABASES={
                'default': {
                    'ENGINE': 'django.db.backends.sqlite3',
                    'NAME': ':memory:',
                }
            },
            INSTALLED_APPS=[
                'django.contrib.auth',
                'django.contrib.contenttypes',
                'rest_framework',
                'events',
                'clubs',
                'users',
            ],
            SECRET_KEY='test-secret-key',
        )

    django.setup()
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(['__main__'])

