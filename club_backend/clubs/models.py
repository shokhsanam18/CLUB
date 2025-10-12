from django.db import models
from django.conf import settings
from django.contrib.auth.models import Group

# Create your models here.
class Club(models.Model):
    name = models.CharField(max_length=100, null=False)
    university = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField(max_length=200, null=True, blank=True)
    logo = models.ImageField(upload_to='media/club_logos', blank=True, null=True)
    
    admin = models.ForeignKey(
        'users.CustomUser',  # use your actual user model reference
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='admin_clubs'
    )

    
    club_points = models.IntegerField(default=0)
    total_events = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            
            models.Index(fields=['-club_points', '-created_at'], name='club_list_primary'),
            models.Index(fields=['university', '-club_points'], name='club_university_points'),
            
            
            models.Index(fields=['name'], name='club_name_search'),
            models.Index(fields=['university'], name='club_university_filter'),
            
            
            models.Index(fields=['created_at'], name='club_created_date'),
            models.Index(fields=['admin'], name='club_admin_lookup'),  
            
            
            models.Index(fields=['university', 'name'], name='club_university_name'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['name', 'university'],
                name='unique_club_per_university'
            ),
        ]
        permissions = [
            ("manage_clubs", "Can manage clubs"),
            ("create_clubs", "Can create new clubs"),
            ("manage_club_members", "Can manage club members"),
            ("view_club_analytics", "Can view club analytics"),
            ("edit_club_points", "Can edit club points"),
        ]
    
    def __str__(self):
        return self.name
    
    # @property
    # def member_count(self):
    #     return self.members.filter(is_active=True).count()
    
    # @property
    # def level(self):
    #     levels = ['Hut', 'House', 'Castle']
    #     total_events = self.events.count()
    #         
    #     if 10 <= total_events <= 25 and self.months_count() >= 3:
    #         return f"Club-{levels[1]}"
    #     if total_events > 25 and self.months_count() >= 6:
    #         return f"Club-{levels[2]}"
    #     
    #     return f"Club-{levels[0]}"
    
    @property
    def months_count(self):
        from django.utils import timezone
        from dateutil.relativedelta import relativedelta
        
        now = timezone.now()
        delta = relativedelta(now, self.created_at)
        return delta.months + (delta.years * 12)
    
    # @property
    # def active_events_count(self):
    #     """Get count of upcoming/ongoing events"""
    #     from django.utils import timezone
    #     return self.events.filter(date__gte=timezone.now()).count()
    
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
    
    rejection_reason = models.TextField(blank=True, null=True)
    
    class Meta:
        indexes = [
            
            models.Index(fields=['club', 'status', '-created_at'], name='joinreq_club_status_date'),
            models.Index(fields=['status', '-created_at'], name='joinreq_status_date'),
            
            
            models.Index(fields=['user', 'club'], name='joinreq_user_club'),
            models.Index(fields=['user', 'status'], name='joinreq_user_status'),
            
            
            models.Index(
                fields=['-created_at'],
                condition=models.Q(status='pending'),
                name='joinreq_pending_recent'
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'club'],
                condition=models.Q(status__in=['pending', 'approved']),
                name='unique_active_join_request'
            ),
        ]
        
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
        self.save()
        self.club.members.add(self.user)

        if hasattr(self.user, 'club'):
            self.user.club = self.club
            self.user.save(update_fields=["club"])

        member_group, _ = Group.objects.get_or_create(name="Member")
        self.user.groups.add(member_group)
        self.save()

    def reject(self, rejecting_user=None, reason=None):
        """Reject request (idempotent)."""
        if self.status == self.STATUS.REJECTED:
            return  # Already rejected
        self.status = self.STATUS.REJECTED
        self.rejection_reason = reason
        self.save(update_fields=['status','rejection_reason'])
        
       
        Notification.objects.create(
            user=self.user,
            title=f"Join request rejected - {self.club.name}",
            message=f"Your request to join '{self.club.name}' has been rejected.",
            reason=reason,
            notification_type='join_request_rejected',
        )
        
class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('join_request_approved', 'Join Request Approved'),
        ('join_request_rejected', 'Join Request Rejected')
    ]
    
    user = models.ForeignKey('users.CustomUser', on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    reason = models.TextField(blank=True, null=True)  # For rejection reason
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    
    
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
        ]
        
        