import shutil
import os
import time
import threading
import datetime
import schedule
from pathlib import Path

# Define paths using pathlib
parent_folder = Path(r'C:\Users\uSeR\Desktop\Minecraft_Folder')
original_directory = parent_folder / "Original Servers"
source_folder = original_directory / "MC_Server"
backup_directory = parent_folder / "Backup Servers"
immediate_backup_directory = parent_folder / "Immediate Backup Servers"
mirror_target_folder_main = parent_folder / "Mirror Folder"
mirror_target_folder = parent_folder / "Mirror Folder" / "MC_Server"

# Global variable to control threads
exit_event = threading.Event()

def schedule_tasks(mirror_time, backup_time, source_folder, mirror_target_folder, number_of_backups):
    # Schedule tasks to run at specified intervals
    schedule.every(mirror_time).minutes.do(lambda: mirror_folder(source_folder, mirror_target_folder))
    schedule.every(backup_time).seconds.do(lambda: save_backup(number_of_backups))

    # Continuously run scheduled tasks until the exit event is set
    while not exit_event.is_set():
        schedule.run_pending()  # Execute pending tasks
        time.sleep(1)  # Wait for 1 second before checking again

def start_threads(mirror_time, backup_time, number_of_backups):
    # Create threads for background tasks
    threads = []

    if backup_time > 0:
        scheduler_thread = threading.Thread(target=schedule_tasks, args=(mirror_time, backup_time, source_folder, mirror_target_folder, number_of_backups), daemon=True)
        scheduler_thread.start()
        threads.append(scheduler_thread)

    return threads

def list_folders(directory): 
    # List all folders in the backup directory and convert to a list
    folders = list(directory.iterdir())  # Convert the generator to a list
    # Sort the folders based on custom logic
    if directory == backup_directory:
        folders.sort(key=lambda x: (x.name.split(' ')[-2], int(x.name.split('-')[-1])))

    print(f"Sorted backup folders (oldest to newest):")
    for idx, folder in enumerate(folders, start=1):
        print(f"{idx}: {folder.name}")
    
    return folders

def create_immediate_backup():
    if source_folder.exists():
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d")
        backup_name = f"{timestamp}-1"
        new_backup_folder = immediate_backup_directory / backup_name

        while new_backup_folder.exists():
            backup_name = f"{timestamp}-{int(backup_name.split('-')[-1]) + 1}"
            new_backup_folder = immediate_backup_directory / backup_name

        shutil.copytree(source_folder, new_backup_folder)
        print(f"Created immediate backup: {new_backup_folder}")
    else:
        print("Source Folder Not Found")
        
def mirror_folder(source_folder, mirror_target_folder):
    if not source_folder.exists():
        print(f"Source folder {source_folder} does not exist.")
        return

    # Create the target (mirror) folder if it doesn't exist
    if not mirror_target_folder.exists():
        mirror_target_folder.mkdir(parents=True, exist_ok=True)
        print(f"Created mirror folder: {mirror_target_folder}")

    for dirpath, dirnames, filenames in os.walk(source_folder):
        # Calculate the relative path of the current directory in the source
        relative_path = Path(dirpath).relative_to(source_folder)
        target_dir = mirror_target_folder / relative_path

        if not target_dir.exists():
            target_dir.mkdir(parents=True)

        for filename in filenames:
            source_file = Path(dirpath) / filename
            target_file = target_dir / filename

            if not target_file.exists() or source_file.stat().st_mtime != target_file.stat().st_mtime:
                shutil.copy2(source_file, target_file) 
                print(f"Copied/Updated: {source_file} -> {target_file}")

    # After copying, check if there are any directories or files in the target (mirror) that don't exist in the source
    clean_up_deleted_folders(source_folder, mirror_target_folder)
    clean_up_deleted_files(source_folder, mirror_target_folder)

def clean_up_deleted_folders(source_folder, mirror_target_folder):
    # Get directories in source and mirror target
    source_dirs = {Path(dirpath).relative_to(source_folder) for dirpath, _, _ in os.walk(source_folder)}
    target_dirs = {Path(dirpath).relative_to(mirror_target_folder) for dirpath, _, _ in os.walk(mirror_target_folder)}

    # Find directories in mirror target that don't exist in source
    dirs_to_delete = target_dirs - source_dirs

    # Delete the excess directories
    for dir_to_delete in dirs_to_delete:
        target_dir = mirror_target_folder / dir_to_delete
        try:
            shutil.rmtree(target_dir)  # Remove the directory
            print(f"Deleted folder: {target_dir}")
        except Exception as e:
            print(f"Failed to delete {target_dir}: {e}")

def clean_up_deleted_files(source_folder, mirror_target_folder):
    for dirpath, dirnames, filenames in os.walk(mirror_target_folder):
        relative_path = Path(dirpath).relative_to(mirror_target_folder)
        source_dir = source_folder / relative_path

        for filename in filenames:
            target_file = Path(dirpath) / filename
            source_file = source_dir / filename

            if not source_file.exists():
                try:
                    target_file.unlink()
                    print(f"Deleted file: {target_file}")
                except Exception as e:
                    print(f"Failed to delete {target_file}: {e}")

def save_backup(number_of_backups):
    
    adjust_backup_folders(number_of_backups)
    # Get the base name of the folder (e.g., 'MC_Server')
    name_of_original_folder = os.path.basename(source_folder)
    
    # Get the current date as YYYY-MM-DD
    time_stamp = datetime.datetime.now().strftime("%Y-%m-%d")
    
    # Initialize the counter for copy number
    counter = 1
    new_folder_name = os.path.join(backup_directory, f"{name_of_original_folder} {time_stamp}-{counter}")
    
    # Ensure the backup directory exists
    if not os.path.exists(backup_directory):
        os.makedirs(backup_directory)
    
    # Check if a folder with the same name already exists, and if so, increment the counter
    while os.path.exists(new_folder_name):
        counter += 1
        new_folder_name = os.path.join(backup_directory, f"{name_of_original_folder} {time_stamp}-{counter}")
    
    # Copy the source folder to the new backup folder
    shutil.copytree(source_folder, new_folder_name)

    print(f"Backup created: {new_folder_name}")

    adjust_backup_folders(number_of_backups)
    adjust_backup_folders(number_of_backups)

def adjust_backup_folders(target_count):
    # Get list of folders in the backup directory
    folders = [f for f in os.listdir(backup_directory) if os.path.isdir(os.path.join(backup_directory, f))]
    
    # Sort the folders by date (YYYY-MM-DD) and by copy number (NN)
    folders.sort(key=lambda x: (x.split(' ')[-1].split('-')[:-1], int(x.split('-')[-1])))

    # Create a dictionary to group folders by date
    date_dict = {}
    
    for folder in folders:
        # Extract date and copy number (e.g., '2024-11-12-2')
        parts = folder.split(' ')
        date_part = parts[-1]
        date_str = '-'.join(date_part.split('-')[:-1])  # e.g., '2024-11-12'
        copy_num = int(date_part.split('-')[-1])  # e.g., '2'
        
        # Group folders by the date part
        if date_str not in date_dict:
            date_dict[date_str] = []
        date_dict[date_str].append((folder, copy_num))
    
    # Flatten the dictionary back into a list and sort by copy number
    sorted_folders = []
    for date_str in sorted(date_dict.keys()):  # Sorting by date
        # Sort by the copy number for each date group
        sorted_folders.extend(sorted(date_dict[date_str], key=lambda x: x[1]))
    
    # Number of folders we currently have
    current_count = len(sorted_folders)

    # If the number of folders exceeds the target count, delete excess folders
    if current_count > target_count:
        # We need to delete the oldest folders first (those with the smallest copy number)
        # We will delete folders from the beginning of the sorted list
        for i in range(current_count - target_count):
            folder_to_delete = sorted_folders[i]  # Select the oldest folder
            folder_path = os.path.join(backup_directory, folder_to_delete[0])
            shutil.rmtree(folder_path)  # Delete the folder
            print(f"Folder deleted: {folder_to_delete[0]}")
    else:
        print("No folders deleted; within target count.")
    
    # Now, rename remaining folders to ensure they start from 1 for each date
    for date_str in sorted(date_dict.keys()):  # Sorting by date
        date_folders = sorted(date_dict[date_str], key=lambda x: x[1])  # Sort by copy number
        for idx, (folder_name, copy_num) in enumerate(date_folders, start=1):
            # Rename the folder to have the correct sequence number
            original_path = os.path.join(backup_directory, folder_name)
            new_folder_name = f"{folder_name.rsplit('-', 1)[0]}-{idx}"
            new_path = os.path.join(backup_directory, new_folder_name)

            if original_path != new_path:
                os.rename(original_path, new_path)  # Rename the folder
                print(f"Renamed {folder_name} to {new_folder_name}")

def range_selection(user_input):
    # Parses user input for specific or range of folder numbers and returns a set of indices.
    selected_folders = set()
    for part in user_input.split(','):
        if '-' in part:  # Handle ranges like "1-3"
            try:
                start, end = map(int, part.split('-'))
                selected_folders.update(range(start, end + 1))
            except ValueError:
                print(f"Invalid range: {part}")
        else:  # Single folder number
            try:
                selected_folders.add(int(part))
            except ValueError:
                print(f"Invalid folder number: {part}")
    return selected_folders

def deleting_backups():
    # List and sort the backup folders
    folders = list_folders(backup_directory)
    print(f"\nThere are {len(folders)} folders in the backup.")
    user_input = input("Enter the folder numbers to delete (e.g.: 1,3,4 or 1-3): ")
    
    folders_to_delete = range_selection(user_input)

    
    if folders_to_delete == 0:
        return print("No Folders Deleted")
    
    # Perform the deletion of selected folders
    try:
        for num in folders_to_delete:
            folder = folders[num - 1] 
            shutil.rmtree(folder)
            print(f"Deleted folder: {folder.name}")
    except Exception as e:
        print(f"Error: {e}")

def replace_corrupted_server():

    backup_options = {
        "1": ("Backup Servers", backup_directory),
        "2": ("Mirrored Backup", mirror_target_folder_main),
        "3": ("Immediate Backup Servers", immediate_backup_directory)}

   
    print("Choose a backup source to restore the original server:")
    for option, (name, q) in backup_options.items():
        print(f"{option}) {name}")
    
    choice = input("Enter your choice (1, 2, or 3): ")
    if choice not in backup_options:
        print("Invalid choice! Please select a valid option.")
        return

    
    backup_type, selected_backup_directory = backup_options[choice]

    # List all folders in the chosen backup directory
    backups = [folder for folder in selected_backup_directory.iterdir() if folder.is_dir()]
    if not backups:
        print(f"No backups available in {backup_type}.")
        return
    
    print(f"Available backups in {backup_type}:")
    list_folders(selected_backup_directory)
    
    backup_name = input("Enter the name of the backup folder you want to use: ")
    backup_path = selected_backup_directory / backup_name
    
    if not backup_path.exists() or not backup_path.is_dir():
        print(f"Error: Backup folder '{backup_name}' does not exist in {backup_type}.")
        return

    # Delete the current Original Server folder if it exists
    if source_folder.exists():
        try:
            shutil.rmtree(source_folder)
            print(f"Deleted existing Original Server at '{source_folder}'.")
        except Exception as e:
            print(f"Error deleting Original Server: {e}")
            return

    # Replace the Original Server with the selected backup
    try:
        shutil.copytree(backup_path, source_folder)
        print(f"Original Server successfully replaced with backup '{backup_name}' from {backup_type}.")
    except Exception as e:
        print(f"Error restoring backup: {e}")