docker buildx build \
  --platform linux/amd64 \
  -t lol-coach-backend \
  .

docker tag lol-coach-backend:latest \
  534315511885.dkr.ecr.us-east-2.amazonaws.com/lol-coach-backend:latest

docker push \
  534315511885.dkr.ecr.us-east-2.amazonaws.com/lol-coach-backend:latest