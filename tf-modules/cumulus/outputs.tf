# API outputs

output "archive_api_uri" {
  value = module.archive.api_uri
}

output "archive_api_redirect_uri" {
  value = module.archive.api_redirect_uri
}

output "distribution_url" {
  value = module.distribution.distribution_url
}

output "distribution_redirect_uri" {
  value = module.distribution.thin_egress_app_redirect_uri
}

output "s3_credentials_redirect_uri" {
  value = module.distribution.s3_credentials_redirect_uri
}

# SNS topics

output "sftracker_sns_topic_arn" {
  value = module.archive.sftracker_sns_topic_arn
}

# Cumulus core task outputs

output "fake_processing_task_lambda_function_arn" {
  value = module.ingest.fake_processing_task_lambda_function_arn
}

output "files_to_granules_task_lambda_function_arn" {
  value = module.ingest.files_to_granules_task_lambda_function_arn
}

output "move_granules_task_lambda_function_arn" {
  value = module.ingest.move_granules_task_lambda_function_arn
}

output "sf_sns_report_task_lambda_function_arn" {
  value = module.ingest.sf_sns_report_task_lambda_function_arn
}

output "sync_granule_task_lambda_function_arn" {
  value = module.ingest.sync_granule_task_lambda_function_arn
}

# Other Lambda outputs

output "post_to_cmr_task_lambda_function_arn" {
  value = module.ingest.post_to_cmr_task_lambda_function_arn
}

output "sf_semaphore_down_lambda_function_arn" {
  value = module.ingest.sf_semaphore_down_lambda_function_arn
}

# IAM outputs

output "lambda_processing_role_arn" {
  value = aws_iam_role.lambda_processing.arn
}

output "step_role_arn" {
  value = module.ingest.step_role_arn
}