# AWS ECS Fargate Deployment for Runechain

This directory contains the configuration and scripts for deploying Runechain to AWS ECS Fargate with continuous deployment from GitHub.

## 🚀 Quick Start

### 1. Initial AWS Setup

Run the setup script to create all necessary AWS resources:

```bash
# Make sure you're logged into AWS CLI
aws configure

# Run the setup script
./.aws/setup.sh
```

This creates:
- ECR repository for Docker images
- ECS cluster and service
- Application Load Balancer
- Security groups and networking
- IAM roles
- CloudWatch log group

### 2. GitHub Configuration

⚠️ **Important**: You must add the AWS_ROLE_ARN secret before pushing to main branch.

Add the following secret to your GitHub repository:

1. Go to Settings → Secrets and variables → Actions
2. Add `AWS_ROLE_ARN` with the value from the setup script output
3. The value will be: `arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole`

If you push without this secret, the workflow will fail at the AWS credentials step.

### 3. Deploy

Push to `main` or `combat-economy-skins` branch to trigger deployment:

```bash
git push origin main
```

## 📁 Files Overview

- `deploy.yml` - GitHub Actions workflow for CI/CD
- `task-definition.json` - ECS task definition template
- `setup.sh` - One-time AWS infrastructure setup script

## 🔧 Configuration

### Environment Variables

The workflow uses these environment variables (can be modified in `deploy.yml`):

- `AWS_REGION`: AWS region (default: us-east-1)
- `ECR_REPOSITORY`: ECR repository name (default: runechain)
- `ECS_SERVICE`: ECS service name (default: runechain-service)
- `ECS_CLUSTER`: ECS cluster name (default: runechain-cluster)

### ⚠️ Lint Warning Notice

You may see lint warnings about "Context access might be invalid: AWS_ROLE_ARN". **These are false positives** and can be safely ignored because:

- ✅ `${{ secrets.AWS_ROLE_ARN }}` is valid GitHub Actions syntax
- ✅ It's officially documented by GitHub
- ✅ The workflow will work correctly when the secret is configured
- ✅ Run `./.aws/validate-workflow.sh` to verify the syntax is correct

To validate the workflow is correct:
```bash
./.aws/validate-workflow.sh
```

### Scaling

To adjust scaling, modify the ECS service:

```bash
aws ecs update-service --cluster runechain-cluster --service runechain-service --desired-count 2
```

For auto-scaling, create a scaling policy:

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/runechain-cluster/runechain-service \
  --min-capacity 1 \
  --max-capacity 10

aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/runechain-cluster/runechain-service \
  --policy-name runechain-scale-out \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration TargetValue=70.0,PredefinedMetricSpecification=PredefinedMetricType=ECSServiceAverageCPUUtilization
```

## 📊 Monitoring

### Logs

View logs in CloudWatch:

```bash
aws logs tail /ecs/runechain --follow
```

### Health Checks

The application includes a `/healthz` endpoint that's used by:
- Container health checks
- Load balancer health checks
- Deployment verification

### Metrics

Key metrics to monitor:
- CPU/Memory utilization
- Request count/latency
- WebSocket connections
- Health check status

## 🛠️ Troubleshooting

### Common Issues

1. **Deployment fails with "service unstable"**
   - Check health check endpoint: `curl http://your-url/healthz`
   - Review CloudWatch logs for errors

2. **Container won't start**
   - Verify Docker image builds locally: `docker build -t test . && docker run -p 8080:8080 test`
   - Check task definition for correct port mappings

3. **Load balancer returns 503**
   - Ensure target group health checks are passing
   - Verify security group allows traffic

### Debug Commands

```bash
# Check service status
aws ecs describe-services --cluster runechain-cluster --services runechain-service

# Check task status
aws ecs list-tasks --cluster runechain-cluster --service-name runechain-service

# View task logs
aws logs get-log-events --log-group-name /ecs/runechain --log-stream-prefix ecs/runechain
```

## 💰 Cost Optimization

- Use Fargate Spot for non-production environments
- Set appropriate CPU/Memory limits (current: 256 CPU, 512MB RAM)
- Enable auto-scaling to match demand
- Consider using smaller instances for development

## 🔒 Security

- IAM roles follow principle of least privilege
- Security group only allows necessary ports
- No sensitive data in container images
- Health checks use internal endpoints only

## 📝 Updates

To update the deployment:

1. Modify configuration files in this directory
2. Update task definition if needed: `aws ecs register-task-definition --cli-input-json file://.aws/task-definition.json`
3. Push changes to trigger deployment

The workflow automatically handles:
- Building new Docker images
- Updating task definitions
- Rolling deployments with zero downtime
- Health check verification