#!/usr/bin/env python3
import subprocess
import os
import shutil
import sys
import argparse
import shutil
from jinja2 import Environment, FileSystemLoader
from pathlib import Path
from typing import Literal

ConfigDir = Literal["exercise", "final", "init"]

def make_shit_executable(filename: Path):
    st = os.stat(filename)
    os.chmod(filename, st.st_mode | 0o111)
    return filename

def copy_common():
    shutil.copyfile("../../common-resources/vimrc", "./.vimrc")

def render_dockerfile_from_template(filename, config_dir: ConfigDir):
    # Write the file back to where it came from
    output_filename = os.path.join(filename.parent, filename.stem)
    print(f"Rendering {filename} to {output_filename}...")

    env = Environment(
        loader=FileSystemLoader(filename.parent),
        trim_blocks=True,
        lstrip_blocks=True,
    )
    template = env.get_template(filename.name)

    dockerfile_text = template.render(
        config_dir = config_dir,
    )
    with open(output_filename, "w", encoding="utf-8") as f:
        f.write(dockerfile_text)
    if (output_filename.endswith(".sh")):
        make_shit_executable(output_filename)

def main(config_dir: ConfigDir):
    """
    Rebuilds the docker environment by running pre-requisite checks,
    cleaning up, and then starting docker compose.
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Run pre-requisite checks
    meets_reqs_script = os.path.join(script_dir, "meets-colima-requirements")
    print(f"--> Running {meets_reqs_script}...")
    try:
        subprocess.run(["bash", meets_reqs_script], check=True)
    except subprocess.CalledProcessError as e:
        sys.exit(1)

    # Run cleanup
    cleanup_script = os.path.join(script_dir, "byoi-cleanup")
    print(f"--> Running {cleanup_script}...")
    try:
        subprocess.run(["bash", cleanup_script], check=True)
    except subprocess.CalledProcessError as e:
        sys.exit(2)

    # Modify template files in root dir and init dir
    for filename in Path('.').glob('*.jinja2'):
        render_dockerfile_from_template(filename, config_dir)
    for filename in Path('./init').glob('*.jinja2'):
        render_dockerfile_from_template(filename, config_dir)

    copy_common()

    # Check for docker-compose (hyphenated) vs docker compose (space)
    command_line_arguments = ["docker", "compose", "up", "--detach", "--force-recreate", "--pull", "never"]
    if shutil.which("docker-compose"):
        print("--> Found 'docker-compose'. Running 'docker-compose up --detach'...")
        command_line_arguments = ["docker-compose", "up", "--detach", "--force-recreate", "--pull", "never"]

    # Run docker compose
    try:
        subprocess.run(command_line_arguments, check=True)
    except subprocess.CalledProcessError as e:
        sys.exit(3)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Bring up the BYOI environment"
    )
    parser.add_argument(
        "--exercise",
        action="store_true",
        required=False,
        default=False,
        help="Build the BYOI Internet™ for the exercise in this chapter",
    )
    parser.add_argument(
        "--final",
        action="store_true",
        required=False,
        default=False,
        help="Build the BYOI Internet™ in its final state for this chapter",
    )
    args = parser.parse_args()
    if args.final and args.exercise:
        parser.print_help()
        sys.exit(1)

    config_dir: ConfigDir = "init"
    if args.final:
        config_dir = "final"
    elif args.exercise:
        config_dir = "exercise"

    main(config_dir)
