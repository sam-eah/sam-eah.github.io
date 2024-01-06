---
title: 'Autoscale AWS Fargate Containers with high availability'
description: ''
pubDate: 'Aug 11 2023'
heroImage: '/world_map_outline.png'
---

Let's imagine a very simple dotnet application that allows you to write messages in a database. Messages are stored with their timestamps. How could you make this application scale? We'll explore a solution written with terraform using AWS provider.

Proposed infra:
<img src="/asg_fargate.png">

`provider.tf`

```hcl
# Terraform relies on plugins called providers to interact with cloud
# providers, SaaS providers, and other APIs.
# Terraform configurations must declare which providers they require
# so that Terraform can install and use them.
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "5.10.0"
    }
  }
}

provider "aws" {
  region = "eu-west-1"
}

# Fetch AZs in the current region
data "aws_availability_zones" "available" {}
```

`vpc.tf`

```hcl
resource "aws_vpc" "vpc" {
  cidr_block = "172.17.0.0/16"
  tags = {
    Name = "messages dotnet vpc"
  }
}
```

`igw.tf`

```hcl
# IGW for the public subnet
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.vpc.id
}

# Route the public subnet traffic through the IGW
resource "aws_route" "internet_access" {
  route_table_id         = aws_vpc.vpc.main_route_table_id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.igw.id
}
```

`subnets.tf`

```hcl
# Create var.az_count private subnets for RDS, each in a different AZ
resource "aws_subnet" "private-subnets" {
  count             = var.az_count
  availability_zone = data.aws_availability_zones.available.names[count.index]
  vpc_id            = aws_vpc.vpc.id
  cidr_block        = cidrsubnet(aws_vpc.vpc.cidr_block, 8, count.index)
}

# Create var.az_count public subnets for fargate, each in a different AZ
resource "aws_subnet" "public-subnets" {
  count                   = var.az_count
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  vpc_id                  = aws_vpc.vpc.id
  map_public_ip_on_launch = true
  cidr_block              = cidrsubnet(aws_vpc.vpc.cidr_block, 8, var.az_count + count.index)
}
```

`sg.tf`

```hcl
# Security Groups

# Internet to ALB
resource "aws_security_group" "sg-lb" {
  name        = "messages-dotnet-alb"
  description = "Allow access on port 80 and 443 only to ALB"
  vpc_id      = aws_vpc.vpc.id

  # HTTP access from anywhere
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS access from anywhere
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ALB TO ECS
resource "aws_security_group" "sg-ecs" {
  name        = "messages-dotnet-tasks"
  description = "allow inbound access from the ALB only"
  vpc_id      = aws_vpc.vpc.id

  ingress {
    protocol        = "tcp"
    from_port       = 80
    to_port         = 80
    security_groups = [aws_security_group.sg-lb.id]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ECS to RDS
resource "aws_security_group" "sg-rds" {
  name        = "messages-dotnet-rds"
  description = "allow inbound access from the ecs tasks only"
  vpc_id      = aws_vpc.vpc.id

  ingress {
    protocol        = "tcp"
    from_port       = var.rds_db_port
    to_port         = var.rds_db_port
    security_groups = [aws_security_group.sg-ecs.id]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

`rds.tf`

```hcl
# create the subnet group for the rds instance
resource "aws_db_subnet_group" "db_subnet_group" {
  name        = "database subnet"
  subnet_ids  = aws_subnet.private-subnets.*.id
  description = "subnets for db instance"

  tags = {
    Name = "database subnet"
  }
}

# create the rds instance
resource "aws_db_instance" "db_instance" {
  db_name                     = var.rds_db_name
  identifier                  = "messages-dotnet-rds"
  username                    = var.rds_username
  password                    = var.rds_password
  port                        = var.rds_db_port
  engine                      = "mysql"
  engine_version              = "5.7"
  parameter_group_name        = "default.mysql5.7"
  multi_az                    = false
  instance_class              = "db.t2.micro"
  allocated_storage           = "10"
  storage_encrypted           = true # free
  vpc_security_group_ids      = [aws_security_group.sg-rds.id]
  db_subnet_group_name        = aws_db_subnet_group.db_subnet_group.name
  storage_type                = "gp2"
  publicly_accessible         = false
  allow_major_version_upgrade = false
  auto_minor_version_upgrade  = true # it's free
  apply_immediately           = true
  maintenance_window          = "sun:02:00-sun:04:00"
  skip_final_snapshot         = true
  copy_tags_to_snapshot       = true
  backup_retention_period     = 7
  backup_window               = "04:00-06:00"
  final_snapshot_identifier   = "messages-dotnet"
  deletion_protection         = true

  # scale storage size

  lifecycle {
    ignore_changes = [
      final_snapshot_identifier,
    ]
    prevent_destroy = true
  }
}
```

`tasks.tf`

```hcl
resource "aws_ecs_task_definition" "task" {
  family                   = "messages-dotnet"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs-tasks-role.arn

  container_definitions = jsonencode(
    [
      {
        image       = "public.ecr.aws/z1v2h6j0/messages-dotnet",
        name        = "messagesdotnet",
        networkMode = "awsvpc",
        portMappings = [
          {
            containerPort = 80,
            hostPort      = 80
          }
        ],
        environment = [
          {
            name  = "CONNECTION_STRING",
            value = "Server=${aws_db_instance.db_instance.address};Port=${aws_db_instance.db_instance.port};Database=${var.rds_db_name};Uid=${var.rds_username};Pwd=${var.rds_password};"
          },
          {
            name  = "ASPNETCORE_ENVIRONMENT",
            value = "Development"
          }
        ],
        logConfiguration = {
          logDriver = "awslogs",
          options = {
            awslogs-create-group  = "true",
            awslogs-group         = "messages-dotnet-logs",
            awslogs-region        = "eu-west-1",
            awslogs-stream-prefix = "awslogs-messages"
          }
        }
      }
    ]
  )

}
```

`target.tf`

```hcl
resource "aws_lb_target_group" "tg" {
  name = "messages-dotnet-tg"
  # Turns out, when combined with ECS, the target group's port doesn't mean
  # anything. You don't need to listen on that port.
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.vpc.id
  target_type = "ip"

  health_check {
    path     = "/"
    matcher  = "200" # expected response code
    interval = 120
    port     = 80
    protocol = "HTTP"
  }
}
```

`ecs.tf`

```hcl
resource "aws_ecs_cluster" "cluster" {
  name = "messages-dotnet-cluster"
}

resource "aws_ecs_service" "ecs" {
  depends_on      = [aws_ecs_task_definition.task, aws_lb_listener.listener]
  name            = "messages-dotnet-service"
  cluster         = aws_ecs_cluster.cluster.id
  task_definition = aws_ecs_task_definition.task.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    assign_public_ip = true # should be false in a private subnet
    security_groups  = [aws_security_group.sg-ecs.id]
    subnets          = aws_subnet.private-subnets.*.id
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.tg.id
    container_name   = "messagesdotnet"
    container_port   = 80
  }
}
```

`alb.tf`

```hcl
resource "aws_lb" "lb" {
  name            = "messages-dotnet-alb"
  subnets         = "${aws_subnet.public-subnets.*.id}"
  security_groups = [aws_security_group.sg-lb.id]
}

output "dns_name" {
  description = "DNS of the load balancer"
  value       = aws_lb.lb.dns_name
}
```

`listener.tf`

```hcl
# Before you start using your Application Load Balancer, you must add one or
# more listeners. A listener is a process that checks for connection requests,
# using the protocol and port that you configure. The rules that you define
# for a listener determine how the load balancer routes requests to its
# registered targets.

resource "aws_lb_listener" "listener" {
  load_balancer_arn = aws_lb.lb.id
  port              = 80
  protocol          = "HTTP"
  # (Optional) ARN of the default SSL server certificate. Exactly one
  # certificate is required if the protocol is HTTPS. For adding additional
  # SSL certificates, see the aws_lb_listener_certificate resource.
  # certificate_arn   = aws_lb_listener_certificate.certificate_arn.arn

  default_action {
    target_group_arn = aws_lb_target_group.tg.id
    type             = "forward"
  }
}
```

`iam.tf`

```hcl
data "aws_iam_policy_document" "ecs_task_policy" {
  statement {
    sid = "EcsTaskPolicy"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage"
    ]
    resources = [
      "*" # you could limit this to only the ECR repo you want
    ]
  }
  statement {
    actions = [
      "ecr:GetAuthorizationToken"
    ]
    resources = [
      "*"
    ]
  }
  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      "*"
    ]
  }
}

data "aws_iam_policy_document" "role_policy" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs-tasks-role" {
  name               = "ecsExecution-1"
  assume_role_policy = data.aws_iam_policy_document.role_policy.json
  path               = "/system/"

  inline_policy {
    name   = "EcsTaskExecutionPolicy"
    policy = data.aws_iam_policy_document.ecs_task_policy.json
  }
}
```

`variables.tf`

```hcl
# Port for RDS
variable "rds_db_port" { default = 3306 }
# User name for RDS
variable "rds_username" { default = "admin" }
# Password for RDS, should not write en clair, use random or auto generate
variable "rds_password" { default = "password" }
# The DB name in the RDS instance. Note that this cannot contain "-"
variable "rds_db_name" { default = "messages" }
# How many AZ's to create in the VPC
variable "az_count" { default = 2 }
```
