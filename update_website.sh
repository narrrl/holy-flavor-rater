sudo docker compose down
git pull origin main
git merge main
CONFLICTS=$(git ls-files -u | wc -l)
if [ "$CONFLICTS" -gt 0 ] ; then
   echo "There are merge conflicts, resolve them and run `sudo docker compose up -d --build` or abort with `git merge --abort`"
   exit -1
fi

sudo docker compose up -d --build
