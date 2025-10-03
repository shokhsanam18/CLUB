from django.contrib import admin
from .models import Club, JoinRequest
# Register your models here.
@admin.register(Club)
class ClubAdmin(admin.ModelAdmin):
    list_display = ('name', 'university', 'club_points', 'total_events')
    list_filter = ('university', 'club_points')
    search_fields = ('name', 'university')
    
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