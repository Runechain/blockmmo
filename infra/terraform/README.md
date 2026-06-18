# RUNECHAIN — ALB / TLS Terraform

Captures the **load-balancer and TLS layer** that fronts the ECS Fargate game host
and gives it a permanent address: **https://play.runechaingame.com**.

These resources were originally provisioned imperatively (AWS CLI); this config
**adopts** them via `import` blocks so they become reproducible going forward — no
recreation, no downtime.

## What this stack manages

| Resource | Name |
| --- | --- |
| Application Load Balancer (internet-facing, 3 AZs) | `runechain-alb` |
| ALB security group + rules (public 80/443, all egress) | `runechain-alb-sg` |
| Ingress rule on the existing task SG (8080 from ALB only) | on `runechain-sg` |
| Target group (`ip`, HTTP:8080, health `/healthz`) | `runechain-tg` |
| ACM certificate (DNS-validated) | `play.runechaingame.com` |
| HTTPS:443 listener (cert → target group) | — |
| HTTP:80 listener (301 → HTTPS) | — |

## What it deliberately does NOT manage

- **ECS cluster / service / task definition** — owned by the deploy pipeline
  (`.github/workflows/deploy.yml` + `.aws/task-definition.json`). `GAME_OPEN=1`
  (serve the game, not the coming-soon page) lives in the task definition.
- **The ECS service ↔ target group attachment** — set once via CLI and preserved
  by the pipeline's `amazon-ecs-deploy-task-definition` step (it only swaps the
  image/task-def and leaves load-balancer config intact). If the service is ever
  recreated from scratch, re-attach it to `aws_lb_target_group.runechain`.
- **DNS** — the domain is on **Vercel**, not Route 53. The records below are
  managed manually in the Vercel dashboard, which is why there is no
  `aws_route53_record` / `aws_acm_certificate_validation` here.

### Vercel DNS records (manual, already in place)

| Type | Name | Value |
| --- | --- | --- |
| CNAME | `play` | `<alb_dns_name output>` |
| CNAME | `_<token>.play` | `_<token>.<...>.acm-validations.aws` (ACM validation) |
| CAA | *(apex, blank name)* | `0 issue "amazon.com"` (required — ACM's CA) |

> The CAA record is essential: Vercel's default CAA set only allows
> Google/Sectigo/Let's Encrypt, which blocks ACM issuance/renewal until
> `amazon.com` is added.

## Usage

```bash
cd infra/terraform
terraform init
terraform plan    # should show the 10 imports and NO resource changes (zero drift)
terraform apply   # writes state; resources already exist, so nothing is created
```

A clean `plan` reporting *"10 to import, 0 to add, 0 to change, 0 to destroy"* is the
proof the config matches reality. After the first apply, `imports.tf` can be deleted.

State is local by default — point `terraform` at an S3 backend before sharing.

## Cost

~$18/month for the ALB (plus negligible LCU/ACM is free). The Fargate task,
ECR, and logs are billed by the existing deploy, not this stack.
