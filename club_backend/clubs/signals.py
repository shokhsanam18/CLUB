from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import JoinRequest

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