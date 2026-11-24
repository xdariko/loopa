#!/usr/bin/env bash
set -Eeuo pipefail

base=/srv/loopa
export PATH="/opt/ruby-3.4.12/bin:/usr/local/bin:/usr/bin:/bin"

exec 9>"$base/.deploy.lock"
flock -n 9 || { echo 'Another deployment is running' >&2; exit 1; }
previous="$(readlink -e "$base/current")"
release="$(mktemp -d "$base/releases/$(date -u +%Y%m%d-%H%M%S)-XXXXXX")"
chmod 0755 "$release"
service_stopped=false
switched=false

point_current() {
  ln -s "$1" "$release/.next-current"
  mv -Tf "$release/.next-current" "$base/current"
}

recover() {
  local status=$?
  trap - EXIT
  if (( status != 0 )); then
    if $switched; then
      echo "Deployment failed. Switching back to $previous." >&2
      point_current "$previous" || exit "$status"
      sudo -n /usr/bin/systemctl restart loopa.service || true
    elif $service_stopped; then
      sudo -n /usr/bin/systemctl start loopa.service || true
    fi
    echo 'Database backups, if created, are in /srv/loopa/shared/backups.' >&2
  fi
  exit "$status"
}
trap recover EXIT

tar -xzf - -C "$release"
test -s "$release/web/dist/index.html"
cd "$release/api"
if [[ -f storage/.keep ]]; then rm -- storage/.keep; fi
rmdir storage
ln -s "$base/shared/storage" storage

bundle _2.6.9_ config set --local without 'development test'
bundle _2.6.9_ config set --local path "$base/shared/bundle"
bundle _2.6.9_ install --jobs 1 --retry 3
set -a
source /etc/loopa.env
set +a

sudo -n /usr/bin/systemctl stop loopa.service
service_stopped=true
backup="$base/shared/backups/$(basename "$release").tar.gz"
tar -czf "$backup.partial" -C "$base/shared" storage
mv "$backup.partial" "$backup"
bundle _2.6.9_ exec ruby bin/rails db:prepare

point_current "$release"
switched=true
sudo -n /usr/bin/systemctl start loopa.service
curl -fsS --max-time 5 --retry 15 --retry-connrefused --retry-delay 1 \
  http://127.0.0.1:3000/up
printf 'Deployed %s\n' "$release"
