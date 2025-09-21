from django.db.models.signals import m2m_changed
from django.dispatch import receiver
from .models import CustomUser

@receiver(m2m_changed, sender=CustomUser.groups.through)
def sync_user_permissions_on_group_change(sender, instance, action, pk_set, **kwargs):
    """Sync user permissions when groups change"""
    if action in ['post_add', 'post_remove', 'post_clear']:
        print(f"Group change for {instance.username}: {action}")
        if hasattr(instance, 'sync_permissions_from_groups'):
            changed = instance.sync_permissions_from_groups()
            if changed:
                print(f"Updated permissions for {instance.username}: is_staff={instance.is_staff}, is_superuser={instance.is_superuser}")