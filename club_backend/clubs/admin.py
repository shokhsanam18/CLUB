from django.contrib import admin, messages
from .models import Club, JoinRequest
# Register your models here.
@admin.register(Club)
class ClubAdmin(admin.ModelAdmin):
    list_display = ('name', 'university', 'admin', 'club_points', 'total_events')
    list_filter = ('university', 'club_points')
    search_fields = ('name', 'university')
    
    def save_model(self, request, obj, form, change):
        """Override save to handle admin changes properly."""
        if change and 'admin' in form.changed_data:
            old_admin = Club.objects.get(pk=obj.pk).admin
            new_admin = obj.admin
            
            if old_admin != new_admin:
                messages.info(
                    request, 
                    f"Admin changed from {old_admin} to {new_admin}. "
                    f"User relationships will be updated automatically."
                )
        
        super().save_model(request, obj, form, change)
    
    def get_readonly_fields(self, request, obj=None):
        """Make certain fields readonly for non-superusers."""
        readonly_fields = []
        if not request.user.is_superuser:
            readonly_fields.append('admin')
        return readonly_fields
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superadmin():
            return qs
        elif request.user.is_ambassador():
            return qs.filter(university=request.user.university)
        return qs.none()
    
@admin.register(JoinRequest)
class JoinRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'user_tg_id', 'club', 'status', 'created_at')
    list_filter = ('status', 'club')
    search_fields = ('user__email', 'club__name', 'user__tg_id')

    actions = ['approve_requests', 'reject_requests']
    
    def user_tg_id(self, obj):
        return obj.user.tg_id if obj.user else None
    user_tg_id.short_description = 'Telegram ID'
    user_tg_id.admin_order_field = 'user__tg_id'

    def approve_requests(self, request, queryset):
        for jr in queryset:
            jr.approve(request.user)
    approve_requests.short_description = "Approve selected join requests"

    def reject_requests(self, request, queryset):
        for jr in queryset:
            jr.reject(request.user)
    reject_requests.short_description = "Reject selected join requests"
    