# RUNECHAIN — load-balancer / TLS layer for the ECS Fargate game host.
#
# SCOPE: this stack owns ONLY the ALB, its security group + rules, the target
# group, the ACM certificate, and the listeners. The ECS cluster, service, and
# task definition are owned by the GitHub Actions deploy pipeline
# (.github/workflows/deploy.yml + .aws/task-definition.json) and are deliberately
# NOT managed here, so the two never fight over the same resources.
#
# The ECS service's load_balancers attachment (registering tasks into this target
# group) was set once via the AWS CLI and is preserved by the pipeline's
# amazon-ecs-deploy-task-definition step. See README.

# --- ALB security group: public 80/443, all egress --------------------------
# No inline ingress/egress on the SG itself — every rule is a standalone,
# individually-importable resource (provider-recommended pattern).
resource "aws_security_group" "alb" {
  name        = "runechain-alb-sg"
  description = "RUNECHAIN ALB - public 80/443"
  vpc_id      = var.vpc_id
  tags        = var.tags
}

resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  description       = "http"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  security_group_id = aws_security_group.alb.id
  description       = "https"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "alb_all" {
  security_group_id = aws_security_group.alb.id
  description       = "all outbound"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

# Let the existing ECS task SG accept the container port from the ALB SG only.
resource "aws_vpc_security_group_ingress_rule" "task_from_alb" {
  security_group_id            = var.task_security_group_id
  description                  = "alb-to-task"
  ip_protocol                  = "tcp"
  from_port                    = var.container_port
  to_port                      = var.container_port
  referenced_security_group_id = aws_security_group.alb.id
}

# --- Target group (Fargate = ip targets) ------------------------------------
resource "aws_lb_target_group" "runechain" {
  name        = "runechain-tg"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"
  tags        = var.tags

  health_check {
    path                = var.health_check_path
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

# --- Application Load Balancer (internet-facing) ----------------------------
resource "aws_lb" "runechain" {
  name               = "runechain-alb"
  load_balancer_type = "application"
  internal           = false
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.subnet_ids
  tags               = var.tags
}

# --- ACM certificate --------------------------------------------------------
# DNS-validated against a CNAME that lives in Vercel DNS (not Route 53), so there
# is intentionally no aws_acm_certificate_validation / aws_route53_record here.
# The validation + `amazon.com` CAA records are managed manually in Vercel (README).
resource "aws_acm_certificate" "play" {
  domain_name       = var.domain_name
  validation_method = "DNS"
  tags              = var.tags

  lifecycle {
    create_before_destroy = true
  }
}

# --- Listeners --------------------------------------------------------------
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.runechain.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.play.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.runechain.arn
  }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.runechain.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      protocol    = "HTTPS"
      port        = "443"
      status_code = "HTTP_301"
    }
  }
}
