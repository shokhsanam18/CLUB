from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Permission
from .models import CustomUser
# Register your models here.

class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'password', 'role', 'university')
    list_filter = ('university', 'groups', 'is_active')
    search_fields = ('first_name', 'last_name')
    
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {
            'fields': ('university', 'bio', 'avatar', 'club', 'joined_club_at', 'is_profile_public')
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superadmin():
            return qs
        elif request.user.is_ambassador():
            # Ambassadors can only see users from their university
            return qs.filter(university=request.user.university)
        return qs.none()
    
    def get_form(self, request, obj=None, **kwargs):
        """Customize form to show only relevant permissions"""
        form = super().get_form(request, obj, **kwargs)
        
        if 'user_permissions' in form.base_fields:
            # Show only custom permissions for this app
            form.base_fields['user_permissions'].queryset = Permission.objects.filter(
                content_type__app_label__in=['users', 'clubs', 'events']
            ).order_by('content_type__model', 'codename')
        
        return form
    
admin.site.register(CustomUser, CustomUserAdmin)

