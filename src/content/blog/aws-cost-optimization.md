---
title: 'AWS Cost Optimization'
description: ''
pubDate: 'Jan 05 2024'
heroImage: '/data_center.png'
---

We're going to use a lambda to turn off resources during the night time.
Since we're using the same actions on different resources, this a good opportunity to use a factory pattern.

Each resource group will have a method to get/update it's resources, a method to start them, one to stop them, and one to tag them. There will also have one to convert them to a readable list, useful for logging

First let's write the base resource class:

`resource.py`

```py
asg = boto3.client("autoscaling")

class Resource:
    tag: str = None
    resources = []
    format = ""

    def __init__(self, tag: str = None):
        self.tag = tag
        self.update_resources()

    def update_resources(self):
        pass

    def tag_next_action(self, next_tag: str):
        return self

    def start_resources(self):
        return self

    def stop_resources(self):
        return self

    def toList(self) -> list:
        pass
```

Utility functions

`utils.py`

```py
def tag_list_contains_all_required_tags(tag_list, required_tags):
    return all(
        item in tag_list_transform(tag_list)
        for item in tag_list_transform(required_tags)
    )


def tag_list_transform(tag_list):
    return [f"{tag['Key']}:{tag['Value']}" for tag in tag_list]
```

### AutoScaling groups

For Autoscaling groups, we'll need to have an environment variable with the min, max and desired capacity when running. We can pass this variable to the lambda.

`asg.py`

```py
from resource import Resource

asg = boto3.client("autoscaling")

ASG_LIST = json.loads(os.environ["ASG_LIST"])

class ASGResource(Resource):
    tag: str = None
    resources = []
    """
    list of ASG resources with given tag and meeting the filter requirements
    """
    format = "ASG"

    def update_resources(self):
        filters = BASE_FILTERS + (
            [{"Name": f"tag:{ACTION_TAG_KEY}", "Values": [self.tag]}] if self.tag else []
        )
        response = asg.describe_auto_scaling_groups(Filters=filters)
        print(f"ASG with tags {filters}:", response)
        if response:
            self.resources = response["AutoScalingGroups"]
            return
        print("an error occured getting the asg resources")

    def tag_next_action(self, next_tag: str):
        for resource in self.resources:
            response = asg.create_or_update_tags(
                Tags=[
                    {
                        "ResourceType": "auto-scaling-group",  # these 2 properties are required despite not being marked as such in boto3 doc
                        "PropagateAtLaunch": True,
                        "ResourceId": resource["AutoScalingGroupName"],
                        "Key": ACTION_TAG_KEY,
                        "Value": next_tag,
                    },
                ],
            )
            if response["ResponseMetadata"]["HTTPStatusCode"] == 200:
                print(f"Tagged ASG {resource['AutoScalingGroupName']} : {next_tag}.")
            else:
                print(f"An error occured tagging ASG {resource['AutoScalingGroupName']}.")
        self.tag = next_tag
        return self

    def start_resources(self):
        for resource in self.resources:
            # find this resource in the lambda env variable list of dict
            var_dict = next(
                item
                for item in ASG_LIST
                if item["name"] == resource["AutoScalingGroupName"]
            )
            response = asg.update_auto_scaling_group(
                AutoScalingGroupName=resource["AutoScalingGroupName"],
                MinSize=var_dict["min"],
                MaxSize=var_dict["max"],
                DesiredCapacity=var_dict["desired"],
            )
            if response["ResponseMetadata"]["HTTPStatusCode"] == 200:
                print(f"Set ASG {resource['AutoScalingGroupName']} capcacity to {var_dict['desired']}, instances should be starting.")
            else:
                print(f"An error occured trying to set ASG {resource['AutoScalingGroupName']} capcacity to {var_dict['desired']}.")
        return self

    def stop_resources(self):
        for resource in self.resources:
            response = asg.update_auto_scaling_group(
                AutoScalingGroupName=resource["AutoScalingGroupName"],
                MinSize=0,
                MaxSize=0,
                DesiredCapacity=0,
            )
            if response["ResponseMetadata"]["HTTPStatusCode"] == 200:
                print(f"Set ASG {resource['AutoScalingGroupName']} capacity to 0, {len(resource['Instances'])} instances should be stopping.")
            else:
                print(f"An error occured trying to set ASG {resource['AutoScalingGroupName']} capcacity to 0.")
        return self

    def toList(self):
        return [{
            'auto_scaling_group_name': resource['AutoScalingGroupName'],
            'current_capacity': len(resource['Instances']),
            'next_action': next(tag['Value'] for tag in resource['Tags'] if tag['Key'] == ACTION_TAG_KEY),
        } for resource in self.resources]
```

### RDS

RDS resources

`rds.py`

```py
class RDSResource(Resource):
    tag: str = None
    resources = []
    format = "RDS"

    def update_resources(self):
        filters = BASE_FILTERS_RDS + (
            [{"Key": ACTION_TAG_KEY, "Value": self.tag}] if self.tag else []
        )
        response = rds.describe_db_clusters()
        # tag filters don't work for rds, so we do it afterwards
        if response:
            filtered_response = [
                dbcluster
                for dbcluster in response["DBClusters"]
                if tag_list_contains_all_required_tags(dbcluster["TagList"], filters)
            ]
            print(f"DB clusters with tags {filters}:", filtered_response)
            self.resources = filtered_response
            return
        print("an error occured getting the rds resources")

    def tag_next_action(self, next_tag):
        for resource in self.resources:
            response = rds.add_tags_to_resource(
                ResourceName=resource["DBClusterArn"],
                Tags=[
                    {
                        "Key": ACTION_TAG_KEY,
                        "Value": next_tag,
                    },
                ],
            )
            if response["ResponseMetadata"]["HTTPStatusCode"] == 200:
                print(f"Tagged DB cluster {resource['DBClusterArn']} : {next_tag}")
            else:
                print(f"An error occured tagging ASG {resource['AutoScalingGroupName']}")
        self.tag = next_tag
        return self

    def waitForDesiredSatus(self, status: str):
        """
        Better not to use, db cluster take ~15min to start/stop
        """
        while any(resource["Status"] != status for resource in self.resources):
            print(f"Waiting for all db clusters to be {status}...")
            time.sleep(10)
            self.update_resources()
            print(f"DB clusters: {self.resources}")
        print(f"all db clusters are {status}!")
        return self

    def start_resources(self):
        for resource in self.resources:
            if resource['Status'] != "available":
                response = rds.start_db_cluster(
                    DBClusterIdentifier=resource["DBClusterIdentifier"]
                )
                if response["ResponseMetadata"]["HTTPStatusCode"] == 200:
                    print(f"RDS cluster {resource['DBClusterIdentifier']} is starting.")
                else:
                    print(f"An error occured trying to start RDS cluster {resource['DBClusterIdentifier']}.")
            else:
                print(f"RDS cluster {resource['DBClusterIdentifier']} is already available.")
        # self.waitForDesiredSatus("available")
        return self

    def stop_resources(self):
        for resource in self.resources:
            if resource['Status'] != "stopped":
                response = rds.stop_db_cluster(
                    DBClusterIdentifier=resource["DBClusterIdentifier"]
                )
                if response["ResponseMetadata"]["HTTPStatusCode"] == 200:
                    print(f"RDS cluster {resource['DBClusterIdentifier']} is stopping.")
                else:
                    print(f"An error occured trying to stop RDS cluster {resource['DBClusterIdentifier']}.")
            else:
                print(f"RDS cluster {resource['DBClusterIdentifier']} is already stopped.")
        # self.waitForDesiredSatus("stopped")
        return self

    def toList(self):
        return [{
            'cluster_id': resource['DBClusterIdentifier'],
            'status': resource['Status'],
            'next_action': next(tag['Value'] for tag in resource['TagList'] if tag['Key'] == ACTION_TAG_KEY),
        } for resource in self.resources]
```

### EC2

```py
class EC2Resource(Resource):
    tag: str = None
    resources = []
    """
    list of EC2 resources with given tag and meeting the filter requirements
    """
    format = "EC2"

    def update_resources(self):
        filters = BASE_FILTERS + (
            [{"Name": f"tag:{ACTION_TAG_KEY}", "Values": ([self.tag] if self.tag else ["*"])}]
        )
        print("fetching EC2 with following tags:", filters)
        response = ec2.describe_instances(Filters=filters)
        print(response)
        if response:
            instances = []
            for reservation in response["Reservations"]:
                for instance in reservation["Instances"]:
                    instances.append(instance)
            self.resources = instances
            return
        print("an error occured getting the EC2 resources")

    def tag_next_action(self, next_tag: str):
        if len(self.resources) > 0:
            instanceIds=[instance["InstanceId"] for instance in self.resources]
            response = ec2.create_tags(
                Resources=instanceIds,
                Tags=[{"Key": ACTION_TAG_KEY, "Value": next_tag}]
            )
            print(response)
            print(f"Tagged instances {instanceIds} with {next_tag}")
        else:
            print("nothing to tag.")
        self.tag = next_tag
        return self

    def start_resources(self):
        if len(self.resources) > 0:
            instanceIds=[instance["InstanceId"] for instance in self.resources]
            ec2.start_instances(InstanceIds=instanceIds)
            print(f"started: {instanceIds}")
        else:
            print("no instance to start")
        return self

    def stop_resources(self):
        if len(self.resources) > 0:
            instanceIds=[instance["InstanceId"] for instance in self.resources]
            ec2.stop_instances(InstanceIds=instanceIds)
            print(f"stopped: {instanceIds}")
        else:
            print("no instance to stop")
        return self

    def toList(self):
        return [{
            'instance_id': resource['InstanceId'],
            'state': EC2_STATES_CODE[str(resource['State']['Code'])],
            'next_action': next(tag['Value'] for tag in resource['Tags'] if tag['Key'] == ACTION_TAG_KEY),
        } for resource in self.resources]
```

### Redshift cluster

```py
class RSResource(Resource):
    tag: str = None
    resources = []
    """
    list of redshift resources with given tag and meeting the filter requirements
    """
    format = "RS"

    def update_resources(self):
        response = rs.describe_clusters(
            TagKeys=[LAMBDA_PROJECT_TAG_KEY, LAMBDA_ENVIRONMENT_TAG_KEY],
            TagValues=[
                LAMBDA_PROJECT_TAG_VALUE,
                LAMBDA_ENVIRONMENT_TAG_VALUE,
            ],
        )

        self.resources = [
            cluster
            for cluster in response["Clusters"]
            if (
                any(
                    tag["Key"] == LAMBDA_PROJECT_TAG_KEY
                    and tag["Value"] == LAMBDA_PROJECT_TAG_VALUE
                    for tag in cluster["Tags"]
                )
                and any(
                    tag["Key"] == LAMBDA_ENVIRONMENT_TAG_KEY
                    and tag["Value"] == LAMBDA_ENVIRONMENT_TAG_VALUE
                    for tag in cluster["Tags"]
                )
                and any(
                    tag["Key"] == ACTION_TAG_KEY
                    and (tag["Value"] == self.tag if self.tag else True)
                    for tag in cluster["Tags"]
                )
            )
        ]
        return self

    def tag_next_action(self, next_tag: str):
        for resource in self.resources:
            response = rs.create_tags(
                ResourceName=f"arn:aws:redshift:{CURRENT_REGION}:{ACCOUNT_ID}:cluster:{resource['ClusterIdentifier']}",
                Tags=[{"Key": ACTION_TAG_KEY, "Value": next_tag}],
            )
            print(response)
            print(f"Tagged Redshift cluster {resource['ClusterIdentifier']} with {next_tag}")
        self.tag = next_tag
        return self

    def start_resources(self):
        for resource in self.resources:
            redshift_id = resource["ClusterIdentifier"]
            started = check_redshift_running(redshift_id)
            while not started:
                try:
                    rs.resume_cluster(ClusterIdentifier=redshift_id)
                    print("cluster started")
                    started = True
                except:
                    print("An exception occurred when starting the Redshift cluster. Starting again in 5 seconds.")
                    time.sleep(5)
                    started = check_redshift_running(redshift_id)

            print(f"started: {redshift_id}")
        if not self.resources:
            print("no redshift cluster to start")
        return self

    def stop_resources(self):
        for resource in self.resources:
            redshift_id = resource["ClusterIdentifier"]
            stopped = check_redshift_stopped(redshift_id)
            while not stopped:
                try:
                    rs.pause_cluster(ClusterIdentifier=redshift_id)
                    print("cluster stopped")
                    stopped = True
                except:
                    print("An exception occurred when stopping the Redshift cluster. Stopping again in 5 seconds.")
                    time.sleep(5)
                    stopped = check_redshift_stopped(redshift_id)

            print(f"stopped: {redshift_id}")
        if not self.resources:
            print("no redshift cluster to stop")
        return self

    def toList(self):
        return [{
            'cluster_id': resource['ClusterIdentifier'],
            'cluster_status': resource['ClusterStatus'],
            'next_action': next(tag['Value'] for tag in resource['Tags'] if tag['Key'] == ACTION_TAG_KEY),
        } for resource in self.resources]


def check_redshift_running(redshift_id):
    response = rs.describe_clusters(ClusterIdentifier=redshift_id)
    for cluster in response["Clusters"]:
        cluster_status = cluster["ClusterStatus"]
        if "available" not in cluster_status:
            print(f"redshift {redshift_id} in {cluster_status} state instead of running state")
            return False
    return True


def check_redshift_stopped(redshift_id):
    response = rs.describe_clusters(ClusterIdentifier=redshift_id)
    for cluster in response["Clusters"]:
        cluster_status = cluster["ClusterStatus"]
        if "paused" != cluster_status:
            print(f"redshift {redshift_id} in {cluster_status} state instead of stopped state")
            return False
    return True
```

### Cloudwatch alarms

```py
class CWResource(Resource):
    tag: str = None
    resources = []
    format = "CW"

    def update_resources(self):
        filters = BASE_FILTERS_RDS + (
            [{"Key": ACTION_TAG_KEY, "Value": self.tag}] if self.tag else []
        )
        paginator = cw.get_paginator('describe_alarms')
        page_iterator = paginator.paginate(
            AlarmTypes=["MetricAlarm"],
        )
        # tag filters are not available for cw, so we do it ourself
        filtered_response = []

        for page in page_iterator:
            alarms = page["MetricAlarms"]
            print(f"found {len(alarms)} alarms")

            for alarm in alarms:
                try:
                    # this method will error for alarms outside of the project (because of the iam policy)
                    response = cw.list_tags_for_resource(ResourceARN=alarm["AlarmArn"])
                    tags = response["Tags"]
                    if tag_list_contains_all_required_tags(tags, filters) and ACTION_TAG_KEY in [tag["Key"] for tag in tags]:
                        alarm["Tags"] = tags
                        filtered_response.append(alarm)
                except Exception as e:
                    pass
        print(f"CW alarms with tags {filters}:", filtered_response)
        self.resources = filtered_response
        return self

    def tag_next_action(self, next_tag):
        for resource in self.resources:
            response = cw.tag_resource(
                ResourceARN=resource["AlarmArn"],
                Tags=[
                    {
                        "Key": ACTION_TAG_KEY,
                        "Value": next_tag,
                    },
                ],
            )
            if response["ResponseMetadata"]["HTTPStatusCode"] == 200:
                print(f"Tagged CW alarm {resource['AlarmArn']} : {next_tag}.")
            else:
                print(f"An error occured tagging ASG {resource['AlarmArn']}.")
        self.tag = next_tag
        return self

    def start_resources(self):
        if len(self.resources) > 0:
            alarmNames = [alarm["AlarmName"] for alarm in self.resources]
            response = cw.enable_alarm_actions(AlarmNames=alarmNames)
            if response["ResponseMetadata"]["HTTPStatusCode"] == 200:
                print(f"Enabled CW alarms {alarmNames}.")
            else:
                print(f"An error occured trying to enable alarms {alarmNames}.")
        else:
            print("nothing to do.")
        return self

    def stop_resources(self):
        if len(self.resources) > 0:
            alarmNames = [alarm["AlarmName"] for alarm in self.resources]
            response = cw.disable_alarm_actions(AlarmNames=alarmNames)
            if response["ResponseMetadata"]["HTTPStatusCode"] == 200:
                print(f"Disabled CW alarms {alarmNames}.")
            else:
                print(f"An error occured trying to disable alarms {alarmNames}.")
        else:
            print("nothing to do.")
        return self

    def toList(self):
        return [{
            'name': resource['AlarmName'],
            'actions_enabled': resource["ActionsEnabled"],
            'next_action': next(tag['Value'] for tag in resource['Tags'] if tag['Key'] == ACTION_TAG_KEY),
        } for resource in self.resources]
```

## Lambda handler

```py
import argparse
import os
import boto3
import time
import json

ACTION_TAG_KEY = "next_action"
ACTION_TAG_VALUES = {
    "start": "start",
    "stop": "stop",
    "get_status": "get_status",
}

def generate_resource_groups(tag: str = None):
    return [
        CWResource(tag),
        ASGResource(tag),
        RDSResource(tag),
        EC2Resource(tag),
        RSResource(tag)
    ]


def lambda_handler(event, context):
    print(event)
    action = event["action"]

    if action in ACTION_TAG_VALUES.keys():
        print(f"starting {action} action")
    else:
        return {
            "error": f'action "{action}" not defined. only valid actions are: {ACTION_TAG_VALUES.keys()}'
        }

    if action == ACTION_TAG_VALUES["start"]:
        resource_groups = generate_resource_groups("start")
        for resource_group in resource_groups:
            resource_group \
                .start_resources() \
                .tag_next_action("stop")

        return {
            "message": "All done. resources started. It Will take 10 to 15 minutes before all and up and running."
        }

    elif action == ACTION_TAG_VALUES["stop"]:
        resource_groups = generate_resource_groups("stop")
        for resource_group in resource_groups:
            resource_group \
                .stop_resources() \
                .tag_next_action("start")

        return {
            "message": "All done. resources stopped. It Will take 10 to 15 minutes before all is shutdown."
        }

    elif action == ACTION_TAG_VALUES["get_status"]:
        resource_groups = generate_resource_groups()

        res = [{
            resource_group.format: resource_group.toList()
        } for resource_group in resource_groups]

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": res
        }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "command",
        choices=ACTION_TAG_VALUES.keys(),
    )
    args = parser.parse_args()
    lambda_handler({"action": args.command}, {})
```

```hcl
locals {
  lambda_start_stop_output_path = "${path.module}/lambdas_output/start_stop_lambda.zip"
}

data "archive_file" "lambda_start_stop" {
  count       = var.environment == "prd" ? 0 : 1
  type        = "zip"
  source_dir  = "${path.module}/lambdas/start_stop_resources"
  excludes    = ["${path.module}/lambdas/start_stop_resources/__pycache__"]
  output_path = local.lambda_start_stop_output_path
}

resource "aws_cloudwatch_log_group" "lambda_logs_start_stop" {
  count             = var.environment == "prd" ? 0 : 1
  name              = "lambda_logs_start_stop"
  retention_in_days = var.environment == "prd" ? 1827 : 7
  #TODO - encrypt

  tags = merge(
    local.predefined_tags,
    { Name = "lambda_logs_start_stop" }
  )
  lifecycle {
    ignore_changes = [
      tags["created_on"],
      tags["created_by"],
    ]
  }
}

resource "aws_lambda_function" "start_stop" {
  count         = var.environment == "prd" ? 0 : 1
  function_name = "start_stop"
  filename      = local.lambda_start_stop_output_path
  role          = aws_iam_role.lambda_start_stop[0].arn
  handler       = "start_stop_resources.lambda_handler"
  runtime       = "python3.9"
  timeout       = 900
  publish       = true
  environment {
    variables = {
      LAMBDA_PROJECT_TAG_KEY       = "project"
      LAMBDA_ENVIRONMENT_TAG_KEY   = "environment"
      LAMBDA_PROJECT_TAG_VALUE     = local.predefined_tags.project
      LAMBDA_ENVIRONMENT_TAG_VALUE = var.environment
      CW_ALARMS_PREFIX             = "cw_prefix"
      CW_ALARMS_TAG                = local.cw_alarms_to_be_updated_by_start_stop_tag_name
      # here json encoded list of ASG with their min max desired values
      ASG_LIST = jsonencode([for item in aws_autoscaling_group.this : {
        name    = item.name,
        max     = var.asg_max_instances,
        min     = var.asg_min_instances,
        desired = var.asg_min_instances,
      }])
    }
  }
  source_code_hash = try(filebase64sha256(local.lambda_start_stop_output_path), "")

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs_start_stop,
    data.archive_file.lambda_start_stop,
  ]
  tags = merge(
    local.predefined_tags
    { Name = "start_stop" },
  )
  lifecycle {
    ignore_changes = [
      tags["created_on"],
      tags["created_by"],
    ]
  }
}

```
