# Defaults capture the live ca-west-1 setup (account 901889466248, default VPC).
# Override via terraform.tfvars to stand the stack up in another env.

variable "region" {
  type    = string
  default = "ca-west-1"
}

variable "domain_name" {
  description = "FQDN the ALB serves (ACM cert subject). DNS lives in Vercel — see README."
  type        = string
  default     = "play.runechaingame.com"
}

variable "vpc_id" {
  type    = string
  default = "vpc-05e82f4b084291854"
}

variable "subnet_ids" {
  description = "Public subnets across >=2 AZs for the internet-facing ALB."
  type        = list(string)
  default     = [
    "subnet-0bceeb250ef0bf4db", # ca-west-1a
    "subnet-08de4824a94138124", # ca-west-1b
    "subnet-04906d678a142a10c", # ca-west-1c
  ]
}

variable "task_security_group_id" {
  description = "Existing ECS task SG (runechain-sg). Owned by the deploy pipeline; we only add an ingress rule to it."
  type        = string
  default     = "sg-0b863eec037e7f8b4"
}

variable "container_port" {
  type    = number
  default = 8080
}

variable "health_check_path" {
  type    = string
  default = "/healthz"
}

variable "tags" {
  type    = map(string)
  default = { project = "runechain" }
}
