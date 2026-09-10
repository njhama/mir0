import { generalIcons } from './general-icon-catalog';
import awsIcons from './aws-icon-catalog.json';
export const iconCatalog = [
  { id: 's3', label: 'Amazon S3', category: 'AWS', color: '#378438', symbol: 'bucket' },
  { id: 'ec2', label: 'Amazon EC2', category: 'AWS', color: '#d57915', symbol: 'server' },
  { id: 'lambda', label: 'AWS Lambda', category: 'AWS', color: '#d57915', symbol: 'function' },
  { id: 'rds', label: 'Amazon RDS', category: 'AWS', color: '#4866c5', symbol: 'database' },
  { id: 'dynamodb', label: 'DynamoDB', category: 'AWS', color: '#4866c5', symbol: 'database' },
  { id: 'sqs', label: 'Amazon SQS', category: 'AWS', color: '#be3a83', symbol: 'queue' },
  { id: 'cloudfront', label: 'CloudFront', category: 'AWS', color: '#8554b7', symbol: 'globe' },
  { id: 'api-gateway', label: 'API Gateway', category: 'AWS', color: '#8554b7', symbol: 'network' },
  { id: 'database', label: 'Database', category: 'General', color: '#4866c5', symbol: 'database' },
  { id: 'server', label: 'Server', category: 'General', color: '#516176', symbol: 'server' },
  { id: 'cache', label: 'Cache / Redis', category: 'General', color: '#c14a40', symbol: 'cache' },
  { id: 'queue', label: 'Message queue', category: 'General', color: '#be3a83', symbol: 'queue' },
  { id: 'load-balancer', label: 'Load balancer', category: 'General', color: '#8554b7', symbol: 'network' },
  { id: 'container', label: 'Container', category: 'General', color: '#2187b0', symbol: 'container' },
  { id: 'browser', label: 'Web app', category: 'General', color: '#2187b0', symbol: 'browser' },
  { id: 'user', label: 'User', category: 'General', color: '#516176', symbol: 'user' },
  { id: 'github', label: 'GitHub', category: 'Development', color: '#24292f', symbol: 'git' },
  ...generalIcons,
  ...awsIcons.map(item => ({ ...item, symbol: 'server' as const })),
] as const;



