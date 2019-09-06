resource "aws_lambda_function" "move_granules_task" {
  function_name    = "${var.prefix}-MoveGranules"
  filename         = "${path.module}/../../tasks/move-granules/dist/lambda.zip"
  source_code_hash = filebase64sha256("${path.module}/../../tasks/move-granules/dist/lambda.zip")
  handler          = "index.handler"
  role             = var.lambda_processing_role_arn
  runtime          = "nodejs8.10"
  timeout          = 300
  memory_size      = 1024

  layers = [var.cumulus_message_adapter_lambda_layer_arn]

  environment {
    variables = {
      CMR_ENVIRONMENT             = var.cmr_environment
      stackName                   = var.prefix
      CUMULUS_MESSAGE_ADAPTER_DIR = "/opt/"
    }
  }

  vpc_config {
    subnet_ids         = var.lambda_subnet_ids
    security_group_ids = [aws_security_group.no_ingress_all_egress.id]
  }

  tags = merge(local.default_tags, { Project = var.prefix })
}