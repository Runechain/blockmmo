# Deploying RUNECHAIN to AWS

The app is a single **zero-dependency Node process** that serves the game client
*and* runs the WebSocket MMO relay on one port. That makes it ideal for AWS,
which (unlike Vercel) can run persistent WebSocket servers.

The client now connects to the WebSocket on the **same origin** it was loaded
from, so it works on any host/port with no code changes.

Pick one path. **Path A (Lightsail) is the simplest and is recommended** — a
plain VM where WebSockets "just work" with no proxy config.

---

## Path A — AWS Lightsail (or EC2) VM  ·  ~5 minutes, cheapest

A single small instance running the Node process directly.

1. **Create the instance.** Lightsail console → *Create instance* → Linux →
   *Node.js* blueprint (or plain Ubuntu) → the $5/mo (or free-tier EC2 `t2.micro`)
   size is plenty.

2. **Open the port.** Instance → *Networking* → add a firewall rule for
   **HTTP / TCP 80** (and 443 if you add TLS later).

3. **Copy the three files up** (`server.js`, `index.html`, `package.json`):
   ```bash
   scp -i your-key.pem server.js index.html package.json \
       ec2-user@YOUR_PUBLIC_IP:/home/ec2-user/runechain/
   ```
   (On Ubuntu the user is `ubuntu@`; create the folder first if needed.)

4. **SSH in and run it on port 80, kept alive:**
   ```bash
   ssh -i your-key.pem ec2-user@YOUR_PUBLIC_IP
   cd runechain
   sudo npm install -g pm2
   sudo PORT=80 pm2 start server.js --name runechain
   sudo pm2 save && sudo pm2 startup    # restart on reboot
   ```

5. **Play:** open `http://YOUR_PUBLIC_IP/` in two browsers. Real multiplayer +
   shared ledger are live. Done.

> Want a domain + HTTPS? Point a domain at the IP and put Caddy or nginx in front
> (Caddy gets you automatic TLS in two lines). WebSockets pass through fine.

---

## Path B — Containerized (ECS Fargate behind an ALB)  ·  scalable

Use the included `Dockerfile`. An Application Load Balancer natively supports
WebSockets.

1. **Build & push to ECR:**
   ```bash
   AWS_ACCOUNT=123456789012; REGION=us-east-1
   aws ecr create-repository --repository-name runechain --region $REGION
   aws ecr get-login-password --region $REGION \
     | docker login --username AWS --password-stdin $AWS_ACCOUNT.dkr.ecr.$REGION.amazonaws.com
   docker build -t runechain .
   docker tag runechain $AWS_ACCOUNT.dkr.ecr.$REGION.amazonaws.com/runechain:latest
   docker push $AWS_ACCOUNT.dkr.ecr.$REGION.amazonaws.com/runechain:latest
   ```

2. **Create an ECS Fargate service** from that image:
   - Container port **8080**.
   - Put it behind an **Application Load Balancer**, target group port 8080,
     health-check path **`/healthz`**.
   - ALB listener on port 80 → forward to the target group. (ALB handles the
     WebSocket `Upgrade` automatically — no extra config.)

3. **Play:** open the ALB's DNS name in two browsers.

> Single-task is fine for a demo. Note: each ECS task keeps its own in-memory
> world/ledger, so if you scale to multiple tasks, players on different tasks
> won't see each other. For a demo, run **one** task (or use Path A). True
> horizontal scale needs a shared backend (Redis/DynamoDB) — see "Next steps".

---

## Path C — AWS App Runner  ·  fully managed, from the same image

Push the image to ECR as in Path B, then App Runner → *Create service* → from
ECR → port **8080**, health-check path `/healthz`. App Runner gives you an HTTPS
URL. (Run a single instance for the demo, same shared-state caveat as Path B.)

---

## Local sanity check before you ship

```bash
PORT=80 sudo node server.js      # or just: node server.js   (defaults to 8080)
# open http://localhost  (or http://localhost:8080) in two tabs
curl -s http://localhost:8080/healthz   # -> ok
```

## Next steps for a production MMO

- **Shared state across instances:** move world + ledger to Redis/DynamoDB so you
  can run more than one container and still have one realm.
- **TLS:** Caddy/nginx (Path A) or the ALB/App Runner HTTPS (Paths B/C). The
  client auto-uses `wss://` on HTTPS pages.
- **Auth & anti-cheat:** the server currently trusts client-mined blocks for the
  demo; a real deployment should validate proof-of-work and movement server-side.
