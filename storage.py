import os
from typing import Optional, Union, BinaryIO
from supabase import create_client, Client


def get_supabase_client() -> Client:
    """
    Initializes and returns a Supabase client using environment variables.

    Requires:
        SUPABASE_URL: The URL of your Supabase project.
        SUPABASE_KEY: The API key (anon or service_role) for your Supabase project.

    Returns:
        Client: An instance of the Supabase Client.
    """
    supabase_url: Optional[str] = os.environ.get("SUPABASE_URL")
    supabase_key: Optional[str] = os.environ.get("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_KEY environment variables must be set."
        )

    return create_client(supabase_url, supabase_key)


def upload_file(
    file: Union[str, bytes, BinaryIO],
    destination_path: Optional[str] = None,
    bucket_name: str = "uploads",
    content_type: Optional[str] = None,
    upsert: bool = False,
) -> dict:
    """
    Uploads a file to the specified Supabase storage bucket ('uploads' by default).

    Args:
        file: Either a file path (str), raw file bytes (bytes), or an open binary file object (BinaryIO).
        destination_path: The remote path/file name in the bucket. If not provided for a file path,
                          the base name of the local file is used.
        bucket_name: The Supabase storage bucket name (defaults to 'uploads').
        content_type: Optional MIME type of the file (e.g. 'application/pdf', 'image/png').
        upsert: Whether to overwrite the file if it already exists (defaults to False).

    Returns:
        dict: The response from the Supabase storage upload call.

    Raises:
        FileNotFoundError: If a file path string is given but the file does not exist.
        ValueError: If destination_path cannot be determined or credentials are missing.
    """
    supabase = get_supabase_client()

    file_options = {"upsert": "true" if upsert else "false"}
    if content_type:
        file_options["content-type"] = content_type

    # Case 1: Local file path
    if isinstance(file, str):
        if not os.path.isfile(file):
            raise FileNotFoundError(f"File not found at path: {file}")

        if destination_path is None:
            destination_path = os.path.basename(file)

        with open(file, "rb") as f:
            file_bytes = f.read()

        response = supabase.storage.from_(bucket_name).upload(
            path=destination_path,
            file=file_bytes,
            file_options=file_options,
        )
        return response

    # Case 2: In-memory bytes
    elif isinstance(file, bytes):
        if destination_path is None:
            raise ValueError(
                "destination_path must be specified when uploading raw bytes."
            )

        response = supabase.storage.from_(bucket_name).upload(
            path=destination_path,
            file=file,
            file_options=file_options,
        )
        return response

    # Case 3: BinaryIO / file-like object
    else:
        if destination_path is None:
            raise ValueError(
                "destination_path must be specified when uploading a file-like object."
            )

        file_bytes = file.read()
        response = supabase.storage.from_(bucket_name).upload(
            path=destination_path,
            file=file_bytes,
            file_options=file_options,
        )
        return response


if __name__ == "__main__":
    # Quick test / usage demonstration
    print("Supabase storage module loaded.")
