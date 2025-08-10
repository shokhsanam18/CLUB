from django.contrib import admin
from .models import Club
# Register your models here.
@admin.register(Club)
class ClubAdmin(admin.ModelAdmin):
    list_display = ('name', 'university', 'club_points', 'total_events')
    list_filter = ('university',)
    search_fields = ('name', 'university')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superadmin():
            return qs
        elif request.user.is_ambassador():
            return qs.filter(university=request.user.university)
        return qs.none()