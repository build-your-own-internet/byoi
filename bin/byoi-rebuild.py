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

def record_data(config_dir: ConfigDir, duration: float, interval: float):
    """Launch the route-propagation recorder + visualizer.

    Runs the viz pipeline from the chapter's working directory (where the `viz/`
    package and `<config_dir>/routers` live). The pipeline records every router's
    BIRD state as the freshly-rebuilt network converges, exports it, and opens a
    browser-based visualization. Skips gracefully if `viz/` isn't present in this
    chapter.
    """
    viz_pkg = Path("viz") / "byoi_viz"
    if not viz_pkg.is_dir():
        print(f"--> --record-data: no {viz_pkg} in this chapter; skipping.")
        return
    print(f"--> --record-data: recording convergence for {duration:.0f}s "
          f"every {interval:g}s, then launching the visualizer...")
    try:
        subprocess.run(
            [sys.executable, "-m", "viz.byoi_viz.pipeline",
             "--duration", str(duration), "--interval", str(interval),
             "--routers-dir", f"{config_dir}/routers"],
            check=True,
        )
    except KeyboardInterrupt:
        pass
    except subprocess.CalledProcessError as e:
        print(f"--> Recorder exited with an error: {e}")


def main(config_dir: ConfigDir, record: bool = False,
         record_duration: float = 180.0, record_interval: float = 2.0):
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

    # Optionally record route propagation and launch the visualizer. We start
    # immediately after compose-up so we capture the network converging from
    # cold start (BGP sessions establishing, OSPF flooding).
    if record:
        record_data(config_dir, record_duration, record_interval)

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
    parser.add_argument(
        "--record-data",
        action="store_true",
        required=False,
        default=False,
        help="After rebuild, record route propagation across all routers and "
             "launch the visualizer (chapters that ship a viz/ package).",
    )
    parser.add_argument(
        "--record-duration",
        type=float,
        default=180.0,
        help="Seconds to record route propagation (default 180 = 3 minutes).",
    )
    parser.add_argument(
        "--record-interval",
        type=float,
        default=2.0,
        help="Seconds between recording snapshots (default 2).",
    )
    args = parser.parse_args()
    if args.final and args.exercise:
        parser.print_help()
        sys.exit(1)

    config_dir: ConfigDir = "init"
    if args.final:
        print("It's the final countdown!")
        config_dir = "final"
    elif args.exercise:
        print("Let's exercise!")
        config_dir = "exercise"

    main(config_dir, record=args.record_data,
         record_duration=args.record_duration,
         record_interval=args.record_interval)
