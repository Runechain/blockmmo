#!/bin/bash
# AWS ECS Fargate Setup Script for Runechain
# Run this script once to create the AWS infrastructure

set -e

# Configuration
REGION="us-east-1"
CLUSTER_NAME="runechain-cluster"
SERVICE_NAME="runechain-service"
REPOSITORY_NAME="runechain"
TASK_FAMILY="runechain"

echo "🚀 Setting up ECS Fargate infrastructure for Runechain..."

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "📋 Using AWS Account: $ACCOUNT_ID"

# Create ECR repository
echo "📦 Creating ECR repository..."
aws ecr create-repository --repository-name $REPOSITORY_NAME --region $REGION || echo "Repository already exists"

# Create ECS cluster
echo "🏗️  Creating ECS cluster..."
aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $REGION || echo "Cluster already exists"

# Create IAM roles for ECS
echo "🔐 Creating IAM roles..."

# ECS Task Execution Role
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document file://trust-policy.json || echo "Role already exists"
aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# ECS Task Role
aws iam create-role --role-name ecsTaskRole --assume-role-policy-document file://trust-policy.json || echo "Role already exists"
aws iam attach-role-policy --role-name ecsTaskRole --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess

# Create CloudWatch Log Group
echo "📊 Creating CloudWatch log group..."
aws logs create-log-group --log-group-name /ecs/runechain --region $REGION || echo "Log group already exists"

# Update task definition with correct account ID
echo "📝 Updating task definition..."
sed -i.bak "s/ACCOUNT_ID/$ACCOUNT_ID/g" .aws/task-definition.json

# Create OIDC trust policy for GitHub Actions
echo "🔐 Creating OIDC trust policy..."
sed "s/ACCOUNT_ID/$ACCOUNT_ID/g; s|USERNAME/REPOSITORY_NAME|$(git config remote.origin.url | sed 's/.*:\/\/github.com\///; s/\.git$//')|g" .aws/github-oidc-trust-policy.json > .aws/github-oidc-trust-policy-updated.json
mv .aws/github-oidc-trust-policy-updated.json .aws/github-oidc-trust-policy.json

# Register task definition
echo "🎯 Registering task definition..."
aws ecs register-task-definition --cli-input-json file://.aws/task-definition.json --region $REGION

# Create VPC and security group (simplified - using default VPC)
echo "🌐 Getting default VPC..."
VPC_ID=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query "Vpcs[0].VpcId" --output text --region $REGION)
SUBNET_ID=$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$VPC_ID --query "Subnets[0].SubnetId" --output text --region $REGION)

# Create security group
echo "🔒 Creating security group..."
SG_ID=$(aws ec2 create-security-group --group-name runechain-sg --description "Runechain ECS security group" --vpc-id $VPC_ID --query "GroupId" --output text --region $REGION || echo "SG already exists")

# Allow HTTP traffic
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $REGION || echo "Ingress rule already exists"
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 8080 --source-group $SG_ID --region $REGION || echo "Ingress rule already exists"

# Create Application Load Balancer
echo "⚖️  Creating Application Load Balancer..."
LB_ARN=$(aws elbv2 create-load-balancer --name runechain-lb --subnets $SUBNET_ID --security-groups $SG_ID --scheme internet-facing --type application --query "LoadBalancers[0].LoadBalancerArn" --output text --region $REGION || echo "LB already exists")

# Create target group
echo "🎯 Creating target group..."
TG_ARN=$(aws elbv2 create-target-group --name runechain-tg --protocol HTTP --port 8080 --vpc-id $VPC_ID --health-check-path /healthz --health-check-interval-seconds 30 --health-check-timeout-seconds 5 --healthy-threshold-count 2 --unhealthy-threshold-count 3 --target-type ip --query "TargetGroups[0].TargetGroupArn" --output text --region $REGION || echo "Target group already exists")

# Create listener
echo "👂 Creating listener..."
aws elbv2 create-listener --load-balancer-arn $LB_ARN --protocol HTTP --port 80 --default-actions Type=forward,TargetGroupArn=$TG_ARN --region $REGION || echo "Listener already exists"

# Create ECS service
echo "🛠️  Creating ECS service..."
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name $SERVICE_NAME \
  --task-definition $TASK_FAMILY \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=$TG_ARN,containerName=runechain,containerPort=8080 \
  --health-check-grace-period-seconds 60 \
  --region $REGION || echo "Service already exists"

# Clean up
rm -f trust-policy.json .aws/task-definition.json.bak

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Create OIDC role for GitHub Actions:"
echo "   aws iam create-role --role-name github-action-role --assume-role-policy-document file://github-oidc-trust-policy.json"
echo "   aws iam attach-role-policy --role-name github-action-role --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
echo "2. Add the following secrets to your GitHub repository:"
echo "   - AWS_ROLE_ARN: arn:aws:iam::$ACCOUNT_ID:role/github-action-role"
echo "3. Push to main branch to trigger deployment"
echo "4. Check the AWS Console for your service URL"
echo ""
echo "🔗 Load Balancer DNS will be available after first deployment"