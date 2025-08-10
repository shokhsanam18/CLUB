from django.db import models

# Create your models here.
class Club(models.Model):
    name = models.CharField(max_length=100, null=False)
    university = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField(max_length=200, null=True, blank=True)
    logo = models.ImageField(upload_to='media/club_logos', blank=True, null=True)

    
    club_points = models.IntegerField(default=0)
    total_events = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['university']),
            models.Index(fields=['name']),
        ]
        unique_together = ['name', 'university']
    
    def __str__(self):
        return f"{self.name} was created!"
    
    @property
    def member_count(self):
        return self.members.filter(is_active=True).count()
    
    @property
    def level(self):
        levels = ['Hut', 'House', 'Castle']
        total_events = self.events.count()
            
        if 10 <= total_events <= 25 and self.months_count() >= 3:
            return f"Club-{levels[1]}"
        if total_events > 25 and self.months_count() >= 6:
            return f"Club-{levels[2]}"
        
        return f"Club-{levels[0]}"
    
    @property
    def months_count(self):
        from django.utils import timezone
        from dateutil.relativedelta import relativedelta
        
        now = timezone.now()
        delta = relativedelta(now, self.created_at)
        return delta.months + (delta.years * 12)
    
    @property
    def active_events_count(self):
        """Get count of upcoming/ongoing events"""
        from django.utils import timezone
        return self.events.filter(start_date__gte=timezone.now()).count()
    
    def add_points(self, points):
        """Add points to club (e.g., after successful event)"""
        self.club_points += points
        self.save(update_fields=['club_points'])
    
    def increment_events(self):
        """Increment total events count"""
        self.total_events += 1
        self.save(update_fields=['total_events'])
        
        