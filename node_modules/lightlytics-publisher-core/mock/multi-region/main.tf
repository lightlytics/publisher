terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.27"
    }
  }
  required_version = ">= 0.14.9"
}

provider "aws" {
  region     = "us-east-1"
  access_key = ""
  secret_key = ""
}

provider "aws" {
  alias = "east2"
  region     = "us-east-2"
  access_key = ""
  secret_key = ""
}

provider "aws" {
  alias = "east3"
  region     = "us-east-3"
  access_key = ""
  secret_key = ""
}

resource "aws_iam_policy" "policy" {
  name        = "test-policy"
  description = "A test policy"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "ec2:Describe*"
      ],
      "Effect": "Allow",
      "Resource": "*"}]}
EOF
}

#######################Create VPC with Subnets and IGw########################
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
    tags = {
    Terraform = "true"
    Environment = "dev"
  }

  name = "test_vpc_main"
  cidr = "10.0.0.0/16"
  secondary_cidr_blocks = ["10.1.0.0/16", "10.2.0.0/16"]
  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  enable_vpn_gateway = true
  create_igw = true
  tags = {
    Terraform = "true"
    Environment = "dev"
  }
    enable_dns_hostnames = true
  enable_dns_support   = true
}

module "vpc2" {
  source = "terraform-aws-modules/vpc/aws"
  providers = {
    aws = aws.east3
  }

  name = "test_vpc_main"
  cidr = "10.0.0.0/16"
  secondary_cidr_blocks = ["10.1.0.0/16", "10.2.0.0/16"]
  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  enable_vpn_gateway = true
  create_igw = true
  tags = {
    Terraform = "true"
    Environment = "dev"
  }
    enable_dns_hostnames = true
  enable_dns_support   = true
}



