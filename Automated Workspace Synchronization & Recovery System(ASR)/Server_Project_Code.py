import shutil, os, time, threading, datetime, schedule
from Server_Functions import *

file_paths = [parent_folder, original_directory, source_folder, backup_directory, immediate_backup_directory, mirror_target_folder_main, mirror_target_folder]

for file in file_paths:
    if not file.exists():
        os.makedirs(file)
        print(f"Directory created: {file}")

while True:
    try:
        print("This program has a Mirrored Backup and Several backup folders to choose from.\nMirrored Backup are for short term data recovery.\nBackup Folders are for long term data recovery")
        while True:
            try:
                number_of_backups = int(input("How many Backup Folders would you like to have: "))
                backup_time = int(input('How many Hours before the next backup: '))
                mirror_time = int(input('How many Minutes between each mirroring: '))
                if backup_time > 0 and mirror_time > 0 and number_of_backups > 0:
                    print('Thank you for your input')
                    break
                else:
                    print("Please input integers above 0 (e.g., 1)")
            except ValueError:
                print("Please input an integer above 0 (e.g., 1)")

        # Pass number_of_backups as the third argument
        threads = start_threads(mirror_time, backup_time, number_of_backups)

        while True:
            key = input("Press 'exit' to stop the backup process:\nOtherwise choose any options below:\n1) List Folders\n2) Make Immediate Backup\n3) Replace Corrupted Server\n4) Delete Backups\nWhat would you like to do: ")
            if key == "1":
                try:
                    folder_to_view = int(input("Please put an integer to choose the folder you would like to view:\n1) Backup Folder\n2) Immediate Backup Servers\n3) Mirror Folder\n4) Original Servers"))
                    if folder_to_view == 1:
                        list_folders(backup_directory)
                    elif folder_to_view == 2:
                        list_folders(immediate_backup_directory)
                    elif folder_to_view == 3:
                        list_folders(mirror_target_folder_main)
                    elif folder_to_view == 4:
                        list_folders(original_directory)
                except Exception as e:
                    print(f'Error: {e} please input a number between 1 and 4')
            elif key == "2":
                create_immediate_backup()
                print("Immediate Backup has been made")
            elif key == "3":
                replace_corrupted_server()
            elif key == "4":
                deleting_backups()
            elif key.lower() == "exit":
                break
            else:
                print("Please choose one of the options listed before")
    except Exception as e:
        print(f'Error {e}')