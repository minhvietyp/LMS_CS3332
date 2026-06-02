import { Button } from 'antd';
import { EmptyState } from './EmptyState';

type ShellErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ShellErrorState({ title = 'Something went wrong', description, onRetry }: ShellErrorStateProps) {
  return (
    <EmptyState
      title={<>{title}</>}
      description={description ?? 'We were unable to load this section right now.'}
      action={onRetry ? <Button onClick={onRetry}>Retry</Button> : undefined}
    />
  );
}
