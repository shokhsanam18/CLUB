from django.db import models
from clubs.models import Club
from users.models import CustomUser

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
    
    class Meta:
        indexes = [
            models.Index(fields=['club']),
            models.Index(fields=['created_by']),
            models.Index(fields=['date']),
            models.Index(fields=['tag']),  # Index for filtering by type
        ]
        
        permissions = [
            ("manage_events", "Can manage events"),
            ("create_events", "Can create events"),
            ("approve_events", "Can approve events"),
            ("cancel_events", "Can cancel events"),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.get_event_type_display()})"

class EventRegistration(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="registrations")
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="registrations")
    created_at = models.DateTimeField(auto_now_add=True)
    attended = models.BooleanField(default=False)
    
    class Meta:
        permissions = [
            ("view_event_registrations", "Can view event registrations"),
            ("manage_event_registrations", "Can manage event registrations"),
            ("mark_attendance", "Can mark event attendance"),
            ("view_all_registrations", "Can view all event registrations"),
        ]
        unique_together = ['event', 'user']
    
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
        permissions = [
            ("view_reports", "Can view event reports"),
            ("review_reports", "Can review event reports"),
            ("approve_reports", "Can approve event reports"),
        ]