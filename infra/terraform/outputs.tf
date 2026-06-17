output "alb_dns_name" {
  description = "ALB hostname — the CNAME target for play.runechaingame.com in Vercel."
  value       = aws_lb.runechain.dns_name
}

output "certificate_arn" {
  value = aws_acm_certificate.play.arn
}

output "target_group_arn" {
  description = "Register the ECS service into this target group (the pipeline already does)."
  value       = aws_lb_target_group.runechain.arn
}

output "alb_security_group_id" {
  value = aws_security_group.alb.id
}

output "public_url" {
  value = "https://${var.domain_name}"
}
