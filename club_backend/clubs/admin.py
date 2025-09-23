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
    list_display = ('user', 'club', 'status', 'created_at')
    list_filter = ('status', 'club')
    search_fields = ('user__email', 'club__name')

    actions = ['approve_requests', 'reject_requests']

    def approve_requests(self, request, queryset):
        for jr in queryset:
            jr.approve(request.user)
    approve_requests.short_description = "Approve selected join requests"

    def reject_requests(self, request, queryset):
        for jr in queryset:
            jr.reject(request.user)
    reject_requests.short_description = "Reject selected join requests"