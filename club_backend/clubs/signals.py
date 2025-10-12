from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import JoinRequest, Club

User = get_user_model()

@receiver(pre_save, sender=JoinRequest)
def store_old_status(sender, instance, **kwargs):
    """Store old status on the instance before saving."""
    if instance.pk:
        try:
            instance._old_status = sender.objects.get(pk=instance.pk).status
        except sender.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=JoinRequest)
def handle_status_change(sender, instance, created, **kwargs):
    if created:
        return  # New request, nothing to do

    old_status = getattr(instance, "_old_status", None)

    if old_status != instance.status:
        if instance.status == instance.STATUS.APPROVED:
            instance.approve()
        elif instance.status == instance.STATUS.REJECTED:
            instance.reject()
            
@receiver(pre_save, sender=Club)
def handle_admin_change_pre_save(sender, instance, **kwargs):
    """Handle admin change before saving - cleanup old admin."""
    if instance.pk:  
        try:
            old_club = Club.objects.get(pk=instance.pk)
            old_admin = old_club.admin
            new_admin = instance.admin
            
            instance._old_admin = old_admin
            instance._admin_changed = (old_admin != new_admin)
            
        except Club.DoesNotExist:
            instance._old_admin = None
            instance._admin_changed = False
    else:
        instance._old_admin = None
        instance._admin_changed = False

@receiver(post_save, sender=Club)
def handle_admin_change_post_save(sender, instance, created, **kwargs):
    """Handle admin change after saving - setup new admin."""
    
    if created:
        if instance.admin:
            setup_club_admin(instance, instance.admin)
    
    elif getattr(instance, '_admin_changed', False):
        old_admin = getattr(instance, '_old_admin', None)
        new_admin = instance.admin
        
        if old_admin:
            cleanup_old_admin(old_admin, instance)
        
        if new_admin:
            setup_club_admin(instance, new_admin)
    
    if hasattr(instance, '_old_admin'):
        delattr(instance, '_old_admin')
    if hasattr(instance, '_admin_changed'):
        delattr(instance, '_admin_changed')

def setup_club_admin(club, admin_user):
    """Set up a user as club admin."""
    # Update user's club field if it exists
    if hasattr(admin_user, 'club'):
        admin_user.club = club
        admin_user.save(update_fields=['club'])
    
    # Add admin to club members if not already a member
    if hasattr(club, 'members') and not club.members.filter(id=admin_user.id).exists():
        club.members.add(admin_user)
    
    # Log the change
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"User {admin_user.username} set as admin for club {club.name}")

def cleanup_old_admin(old_admin, club):
    """Clean up the old admin when admin is changed."""
    if hasattr(old_admin, 'club') and old_admin.club == club:
        old_admin.club = None
        old_admin.save(update_fields=['club'])
    
    
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"User {old_admin.username} removed as admin from club {club.name}")