from django.db import models
from clubs.models import Club
from users.models import CustomUser

from django.utils import timezone

# Create your models here.
class Event(models.Model):
    
    class EventTag(models.TextChoices):
        DISCUSSION = 'discussion'
        HACKATHON = 'hackathon'
        MOVIE_SCREENING = 'movie_screening'
        QUIZ = 'quiz'
        PRESENTATION = 'presentation'
        WORKSHOP = 'workshop'
        
    title = models.CharField(max_length=100, null=False, blank=False)
    description = models.TextField(max_length=500, null=True, blank=True)
    club = models.ForeignKey(Club, on_delete=models.CASCADE, null=False, blank=False, related_name="events")
    tag = models.CharField(max_length=50, choices=EventTag.choices, default=EventTag.DISCUSSION)
    date = models.DateTimeField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='events')
    
    poster = models.ImageField(upload_to='media/events/posters', default='media/events/default_event_poster_image.png')
    
    class Meta:
        indexes = [
            models.Index(fields=['date'], name='event_date_primary'),
            models.Index(fields=['-date'], name='event_date_desc'),
            
            models.Index(fields=['club', 'date'], name='event_club_date'),
            models.Index(fields=['created_by', '-date'], name='event_creator_date'),
            
            models.Index(
                fields=['date'], 
                condition=models.Q(date__gte=timezone.now()),
                name='event_upcoming_only'
            ),
            
            models.Index(fields=['club', 'created_at'], name='event_club_stats'),
            models.Index(fields=['date', 'club'], name='event_date_club_stats'),
        ]
        
        permissions = [
            ("manage_events", "Can manage events"),
            ("create_events", "Can create events"),
            ("approve_events", "Can approve events"),
            ("cancel_events", "Can cancel events"),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.get_tag_display()})"
    

class EventRegistration(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="registrations")
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="registrations")
    created_at = models.DateTimeField(auto_now_add=True)
    attended = models.BooleanField(default=False)
    
    class Meta:
        indexes = [
            
            models.Index(fields=['user', 'event'], name='registration_user_event'),
            models.Index(fields=['event', 'user'], name='registration_event_user'),
            
            
            models.Index(fields=['event', 'attended'], name='registration_event_attendance'),
            models.Index(fields=['event', 'created_at'], name='registration_event_date'),
            
            
            models.Index(fields=['user', '-created_at'], name='registration_user_recent'),
        ]
        
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'event'],
                name='unique_user_event_registration'
            ),
        ]
        permissions = [
            ("view_event_registrations", "Can view event registrations"),
            ("manage_event_registrations", "Can manage event registrations"),
            ("mark_attendance", "Can mark event attendance"),
            ("view_all_registrations", "Can view all event registrations"),
        ]
        
    
class EventReport(models.Model):
    event = models.OneToOneField(Event, on_delete=models.CASCADE, related_name='reports')
    submitted_by = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='submitted_reports')
    submitted_at = models.DateTimeField(auto_now_add=True)
    participants_attended = models.IntegerField()
    summary = models.TextField(max_length=512, null=False, blank=False)
    
    def calculate_attendance(self):
        return self.event.registrations.filter(attended=True).count()
    
    def save(self, *args, **kwargs):
        if self.pk is None:
            self.participants_attended = self.calculate_attendance()
        super().save(*args, **kwargs)
        
    class Meta:
        indexes = [
            models.Index(fields=['submitted_by', '-submitted_at'], name='report_submitter_recent'),
            models.Index(fields=['event'], name='report_event_lookup'),
            models.Index(fields=['-submitted_at'], name='report_recent_all'),
        ]
        
        permissions = [
            ("view_reports", "Can view event reports"),
            ("review_reports", "Can review event reports"),
            ("approve_reports", "Can approve event reports"),
        ]