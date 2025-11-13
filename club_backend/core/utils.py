import os
import uuid
import boto3
from botocore.exceptions import ClientError
from django.conf import settings
from typing import Optional, Tuple

class S3FileUploader:
    """Utility class for handling S3 file uploads"""
    
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            region_name=os.environ.get('AWS_REGION'),
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
        )
        self.bucket_name = os.environ.get('S3_BUCKET_NAME')
        
        if not self.bucket_name:
            raise ValueError("S3_BUCKET_NAME environment variable is required")
    
    def validate_file(self, uploaded_file, allowed_types: list = None, max_size_mb: int = 5) -> Tuple[bool, str]:
        """Validate uploaded file"""
        if allowed_types is None:
            allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        
        # Check file size
        if uploaded_file.size > max_size_mb * 1024 * 1024:
            return False, f"File size exceeds {max_size_mb}MB limit"
        
        # Check content type
        content_type = uploaded_file.content_type
        if content_type not in allowed_types:
            return False, f"File type {content_type} not allowed"
        
        return True, ""
    
    def upload_file(self, uploaded_file, folder: str, user_id: int = None) -> Optional[str]:
        """Upload file to S3 and return URL"""
        try:
            # Validate file
            is_valid, error_msg = self.validate_file(uploaded_file)
            if not is_valid:
                raise ValueError(error_msg)
            
            # Generate unique filename
            file_extension = self._get_file_extension(uploaded_file.name)
            if user_id:
                file_name = f"{user_id}_{uuid.uuid4()}.{file_extension}"
            else:
                file_name = f"{uuid.uuid4()}.{file_extension}"
            
            s3_key = f"{folder}/{file_name}"
            
            # Upload to S3
            self.s3_client.upload_fileobj(
                uploaded_file,
                self.bucket_name,
                s3_key
            )
            
            # Return S3 URL
            return f"https://{self.bucket_name}.s3.{os.environ.get('AWS_REGION')}.amazonaws.com/{s3_key}"
            
        except Exception as e:
            print(f"Upload error: {e}")
            raise
    
    def delete_file_from_url(self, file_url: str) -> bool:
        """Delete file from S3 using its URL"""
        try:
            if not file_url:
                return True
            
            s3_key = self._extract_s3_key_from_url(file_url)
            if not s3_key:
                return False
            
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            return True
            
        except Exception as e:
            print(f"Error deleting file from S3: {e}")
            return False
    
    def _get_file_extension(self, filename: str) -> str:
        """Get file extension from filename"""
        if '.' in filename:
            return filename.split('.')[-1].lower()
        return 'png'
    
    def _extract_s3_key_from_url(self, url: str) -> Optional[str]:
        """Extract S3 key from S3 URL"""
        try:
            parts = url.split('.amazonaws.com/')
            if len(parts) == 2:
                return parts[1]
            return None
        except:
            return None