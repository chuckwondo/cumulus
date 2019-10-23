module "ingest" {
  source = "../ingest"

  prefix = var.prefix

  buckets = var.buckets

  distribution_url                         = module.distribution.distribution_url
  cumulus_message_adapter_lambda_layer_arn = var.cumulus_message_adapter_lambda_layer_arn

  # Buckets config
  system_bucket = var.system_bucket

  # VPC config
  vpc_id            = var.vpc_id
  lambda_subnet_ids = var.lambda_subnet_ids

  # IAM config
  permissions_boundary_arn   = var.permissions_boundary_arn
  lambda_processing_role_arn = aws_iam_role.lambda_processing.arn

  # CMR config
  cmr_oauth_provider = var.cmr_oauth_provider
  cmr_username       = var.cmr_username
  cmr_provider       = var.cmr_provider
  cmr_client_id      = var.cmr_client_id
  cmr_password       = module.archive.encrypted_cmr_password
  cmr_environment    = var.cmr_environment
  cmr_limit          = var.cmr_limit
  cmr_page_size      = var.cmr_page_size

  # Launchpad config
  launchpad_api         = var.launchpad_api
  launchpad_certificate = var.launchpad_certificate
  launchpad_passphrase  = module.archive.encrypted_launchpad_passphrase

  # DB config
  dynamo_tables = var.dynamo_tables

  log2elasticsearch_lambda_function_arn = module.archive.log2elasticsearch_lambda_function_arn

  queue_execution_limits = var.queue_execution_limits

  report_executions_sns_topic_arn = module.archive.report_executions_sns_topic_arn
  report_granules_sns_topic_arn   = module.archive.report_granules_sns_topic_arn
  report_pdrs_sns_topic_arn       = module.archive.report_pdrs_sns_topic_arn

  release = var.release
  local_core_lambda = var.local_core_lambda
}
