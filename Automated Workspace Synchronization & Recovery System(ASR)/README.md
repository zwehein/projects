# Automated Workspace Synchronization & Recovery System (ASR)

A Python command-line utility for keeping a workspace mirrored and maintaining both scheduled and on-demand backups. It was built around a Minecraft server folder, but its file-copy workflows can be adapted to other directory-based workspaces.

## Features

- Periodically mirrors the source directory and removes files from the mirror when they are removed from the source.
- Creates dated, rotating backups for longer-term recovery.
- Creates immediate backups on request.
- Provides interactive options to list folders, restore a server, and remove backups.
- Runs scheduled work in a background thread while the command-line menu remains available.

## Project files

- `Server_Project_Code.py` — interactive entry point and menu.
- `Server_Functions.py` — scheduling, mirror, backup, restore, and cleanup functions.

## Requirements

- Python 3.9 or later
- `schedule`

Install the dependency with:

```bash
python -m pip install schedule
```

## Before running

Open `Server_Functions.py` and update `parent_folder` to the directory that contains the workspace you want to protect. The current source path is configured for a Minecraft server folder. Confirm the source, mirror, and backup locations before starting so the tool operates on the intended data.

## Run

```bash
python Server_Project_Code.py
```

When prompted, choose the number of rotating backups, the interval between backups (hours), and the mirror interval (minutes). The menu supports listing stored folders, making an immediate backup, replacing a damaged server from a backup, deleting backups, and exiting.

## Notes

The mirror is synchronized to the source, including deletion of files and folders that no longer exist in the source. Use the separate dated backups for recovery. This project is a local utility and does not provide cloud storage or remote monitoring.

The current prompt labels the backup interval in hours, but the scheduler uses that value as seconds. Correct the schedule unit in `Server_Functions.py` before relying on unattended backup timing.
