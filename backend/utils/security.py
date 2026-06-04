import re
import os

def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename by removing path components and keeping only safe characters.
    """
    # Remove path components
    filename = os.path.basename(filename)
    # Keep only alphanumeric, dot, underscore, and hyphen
    filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    return filename
