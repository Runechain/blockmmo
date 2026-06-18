# Import blocks (Terraform >= 1.5) so `terraform plan` ADOPTS the resources that
# were provisioned via the AWS CLI, rather than trying to recreate them.
# After the first successful `terraform apply` (or plan -generate-config), these
# blocks are harmless no-ops and can be deleted.
#
# Captured from ca-west-1 / account 901889466248.

import {
  to = aws_security_group.alb
  id = "sg-0ebe2b92231d1d006"
}

import {
  to = aws_vpc_security_group_ingress_rule.alb_http
  id = "sgr-02d5042f1b127c297"
}

import {
  to = aws_vpc_security_group_ingress_rule.alb_https
  id = "sgr-0a62206ad695227ba"
}

import {
  to = aws_vpc_security_group_egress_rule.alb_all
  id = "sgr-04ba94010b8d27bbe"
}

import {
  to = aws_vpc_security_group_ingress_rule.task_from_alb
  id = "sgr-02c57e39a55a81146"
}

import {
  to = aws_lb_target_group.runechain
  id = "arn:aws:elasticloadbalancing:ca-west-1:901889466248:targetgroup/runechain-tg/c3633ce2dd295b29"
}

import {
  to = aws_lb.runechain
  id = "arn:aws:elasticloadbalancing:ca-west-1:901889466248:loadbalancer/app/runechain-alb/0c9e8859e3230b45"
}

import {
  to = aws_acm_certificate.play
  id = "arn:aws:acm:ca-west-1:901889466248:certificate/fa7a7553-15da-473c-990c-38aff995ae35"
}

import {
  to = aws_lb_listener.https
  id = "arn:aws:elasticloadbalancing:ca-west-1:901889466248:listener/app/runechain-alb/0c9e8859e3230b45/a4faa0beb6ba4ee8"
}

import {
  to = aws_lb_listener.http_redirect
  id = "arn:aws:elasticloadbalancing:ca-west-1:901889466248:listener/app/runechain-alb/0c9e8859e3230b45/96891ed9f5d5330c"
}
