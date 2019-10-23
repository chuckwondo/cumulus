locals {
  post_to_cmr_dist_path = "${path.module}/../../tasks/post-to-cmr/dist/lambda.zip"
}

module "post_to_cmr_source" {
  source = "../github_lambda_source"
  archive = local.post_to_cmr_dist_path
  release = var.release
   repo = "Jkovarik/cumulus"
  zip_file = "cumulus-post-to-cmr-task.zip"
  local_core_lambda = var.local_core_lambda
}

resource "aws_lambda_function" "post_to_cmr_task" {
  function_name    = "${var.prefix}-PostToCmr"
  filename         = local.post_to_cmr_dist_path
  source_code_hash = filebase64sha256(local.post_to_cmr_dist_path)
  handler          = "index.handler"
  role             = var.lambda_processing_role_arn
  runtime          = "nodejs8.10"
  timeout          = 300
  memory_size      = 256

  layers = [var.cumulus_message_adapter_lambda_layer_arn]

  environment {
    variables = {
      CMR_ENVIRONMENT             = var.cmr_environment
      stackName                   = var.prefix
      system_bucket               = var.system_bucket
      CUMULUS_MESSAGE_ADAPTER_DIR = "/opt/"
    }
  }

  vpc_config {
    subnet_ids         = var.lambda_subnet_ids
    security_group_ids = var.lambda_subnet_ids == null ? null : [aws_security_group.no_ingress_all_egress[0].id]
  }

  tags = merge(local.default_tags, { Project = var.prefix })
}

resource "aws_cloudwatch_log_group" "post_to_cmr_task" {
  name = "/aws/lambda/${aws_lambda_function.post_to_cmr_task.function_name}"
  tags = local.default_tags
}

resource "aws_cloudwatch_log_subscription_filter" "post_to_cmr_task" {
  name            = "${var.prefix}-PostToCmrSubscription"
  destination_arn = var.log2elasticsearch_lambda_function_arn
  filter_pattern  = ""
  log_group_name  = aws_cloudwatch_log_group.post_to_cmr_task.name
  distribution    = "ByLogStream"
}
