from django.db import models
from django.conf import settings
from django.contrib.auth.models import Group

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
        permissions = [
            ("manage_clubs", "Can manage clubs"),
            ("create_clubs", "Can create new clubs"),
            ("manage_club_members", "Can manage club members"),
            ("view_club_analytics", "Can view club analytics"),
            ("edit_club_points", "Can edit club points"),
        ]
    
    def __str__(self):
        return f"{self.name} was created!"
    
    # @property
    # def member_count(self):
    #     return self.members.filter(is_active=True).count()
    
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
        return self.events.filter(date__gte=timezone.now()).count()
    
    def add_points(self, points):
        """Add points to club (e.g., after successful event)"""
        self.club_points += points
        self.save(update_fields=['club_points'])
    
    def increment_events(self):
        """Increment total events count"""
        self.total_events += 1
        self.save(update_fields=['total_events'])
        
class JoinRequest(models.Model):
    
    class STATUS(models.TextChoices):
        PENDING = 'pending'
        APPROVED = 'approved'
        REJECTED = 'rejected'
        
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    club = models.ForeignKey(Club, on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS.choices, default=STATUS.PENDING)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'club']
        
    def approve(self, approving_user=None):
        """Approve request and update memberships/roles (idempotent)."""
        if self.status == self.STATUS.APPROVED:
            # Already approved → just ensure consistency
            if self.user not in self.club.members.all():
                self.club.members.add(self.user)

            if hasattr(self.user, 'club') and self.user.club != self.club:
                self.user.club = self.club
                self.user.save(update_fields=["club"])

            member_group, _ = Group.objects.get_or_create(name="Member")
            if not self.user.groups.filter(name="Member").exists():
                self.user.groups.add(member_group)
            return

        # First-time approval
        self.status = self.STATUS.APPROVED
        self.club.members.add(self.user)

        if hasattr(self.user, 'club'):
            self.user.club = self.club
            self.user.save(update_fields=["club"])

        member_group, _ = Group.objects.get_or_create(name="Member")
        self.user.groups.add(member_group)

    def reject(self, rejecting_user=None):
        """Reject request (idempotent)."""
        if self.status == self.STATUS.REJECTED:
            return  # Already rejected
        self.status = self.STATUS.REJECTED
        
        