import { Alert, Button, Card, Empty, List, Space, Tag, Typography } from 'antd';
import { Bell, BookOpen, MessageSquare, SquareCheckBig } from 'lucide-react';
import { ClientLayout, ClientPageContainer } from '../components/client/layout';
import { useAuth } from '../components/context/AuthContext';
import './ClientNotificationsPage.css';

const demoNotifications = [
  {
    id: '1',
    title: 'Progress synced',
    description: 'Your most recent activity has been saved successfully.',
    time: 'Just now',
    unread: true,
    type: 'progress',
  },
  {
    id: '2',
    title: 'Course updates',
    description: 'Live course and messaging notifications can be connected here next.',
    time: 'Today',
    unread: false,
    type: 'course',
  },
  {
    id: '3',
    title: 'Assignment reminder',
    description: 'A due date alert can appear here with a direct action back into the course flow.',
    time: 'Tomorrow',
    unread: true,
    type: 'assignment',
  },
];

export function ClientNotificationsPage() {
  const { user } = useAuth();
  const summaryItems = user?.role === 'INSTRUCTOR'
    ? [
        { label: 'Unread alerts', value: '6', icon: Bell },
        { label: 'Submission updates', value: '4', icon: SquareCheckBig },
        { label: 'Course messages', value: '3', icon: MessageSquare },
      ]
    : [
        { label: 'Unread alerts', value: '5', icon: Bell },
        { label: 'Learning reminders', value: '2', icon: BookOpen },
        { label: 'Course messages', value: '1', icon: MessageSquare },
      ];

  const getIcon = (type: string) => {
    if (type === 'assignment') {
      return SquareCheckBig;
    }

    if (type === 'course') {
      return BookOpen;
    }

    return Bell;
  };

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Notifications"
        subtitle={
          user?.role === 'INSTRUCTOR'
            ? 'Follow teaching alerts, course changes, and learner activity in one place.'
            : 'Review learning alerts, course updates, and activity notices in one place.'
        }
        actions={<Button disabled>Mark all as read</Button>}
      >
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="Notification API integration is still pending."
            description="This client page is now wired into the shared layout and ready for live data next."
          />
          <div className="client-notifications-summary">
            {summaryItems.map((item) => {
              const Icon = item.icon;

              return (
                <Card key={item.label} className="client-notifications-summary__card">
                  <Icon size={18} />
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </Card>
              );
            })}
          </div>
          <Card className="client-notifications-list-card">
            {demoNotifications.length ? (
              <List
                itemLayout="horizontal"
                dataSource={demoNotifications}
                renderItem={(item) => (
                  <List.Item className="client-notifications-list__item">
                    <List.Item.Meta
                      avatar={(() => {
                        const Icon = getIcon(item.type);

                        return <Icon size={18} />;
                      })()}
                      title={
                        <Space size={8}>
                          <span>{item.title}</span>
                          {item.unread ? <Tag color="purple">Unread</Tag> : null}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={4}>
                          <Typography.Text type="secondary">{item.description}</Typography.Text>
                          <Typography.Text type="secondary">{item.time}</Typography.Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="No notifications yet." />
            )}
          </Card>
        </Space>
      </ClientPageContainer>
    </ClientLayout>
  );
}
