import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Set up permissions and groups for all apps'

    def handle(self, *args, **options):
        self.stdout.write('Setting up permissions and groups for all apps...')
        
        self.create_permission_groups()
        
        self.stdout.write(
            self.style.SUCCESS('Successfully set up all permissions and groups!')
        )

    def create_permission_groups(self):
        """Create all permission groups"""
        
        # Superadmin Group - Full access to everything
        superadmin_group, created = Group.objects.get_or_create(name='Superadmin')
        if created:
            self.stdout.write('Created Superadmin group')
        
        # Give ALL permissions to superadmin (from all apps)
        all_permissions = Permission.objects.filter(
            content_type__app_label__in=['users', 'clubs', 'events']
        )
        superadmin_group.permissions.set(all_permissions)
        
        # Ambassador Group
        ambassador_group, created = Group.objects.get_or_create(name='Ambassador')
        if created:
            self.stdout.write('Created Ambassador group')
        
        ambassador_permissions = [
            # Users app permissions
            ('users', 'view_all_profiles'),
            ('users', 'view_private_profiles'),
            ('users', 'assign_volunteers'),
            ('users', 'assign_ambassadors'),
            
            # Clubs app permissions  
            ('clubs', 'manage_clubs'),
            ('clubs', 'create_clubs'),
            ('clubs', 'manage_club_members'),
            ('clubs', 'view_club_analytics'),
            
            # Events app permissions
            ('events', 'manage_events'),
            ('events', 'create_events'),
            ('events', 'approve_events'),
            ('events', 'view_event_registrations'),
            ('events', 'manage_event_registrations'),
            ('events', 'mark_attendance'),
            ('events', 'view_all_registrations'),
            ('events', 'view_reports'),
            ('events', 'review_reports'),
        ]
        
        self.assign_permissions_to_group(ambassador_group, ambassador_permissions)
        
        # Volunteer Group
        volunteer_group, created = Group.objects.get_or_create(name='Volunteer')
        if created:
            self.stdout.write('Created Volunteer group')
        
        volunteer_permissions = [
            # Events app permissions (limited)
            ('events', 'create_events'),
            ('events', 'manage_events'),  # Limited by business rules
            ('events', 'view_event_registrations'),
            ('events', 'manage_event_registrations'),  # Limited by business rules
            ('events', 'mark_attendance'),  # Limited by business rules
            ('events', 'add_eventreport'),
        ]
        
        self.assign_permissions_to_group(volunteer_group, volunteer_permissions)
        
        # Member Group
        member_group, created = Group.objects.get_or_create(name='Member')
        if created:
            self.stdout.write('Created Member group')
        # Members get basic permissions handled by business rules
        
    def assign_permissions_to_group(self, group, permissions_list):
        """Helper to assign permissions to a group"""
        for app_label, codename in permissions_list:
            try:
                perm = Permission.objects.get(
                    content_type__app_label=app_label,
                    codename=codename
                )
                group.permissions.add(perm)
            except Permission.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(f'Permission {app_label}.{codename} not found'))