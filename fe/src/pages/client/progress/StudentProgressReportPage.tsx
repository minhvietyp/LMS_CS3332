import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Col, Empty, Row, Spin, Statistic, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { progressService } from '../../../services/api/progressService';
import type { ProgressHistoryItem } from '../../../types/progress';

export function StudentProgressReportPage() {
  const overviewQuery = useQuery({
    queryKey: ['reports', 'student-progress', 'overview'],
    queryFn: progressService.getOverview,
    staleTime: 60_000,
  });

  const historyQuery = useQuery({
    queryKey: ['reports', 'student-progress', 'history'],
    queryFn: () => progressService.getMyProgressHistory({ page: 1, pageSize: 10 }),
    staleTime: 60_000,
  });

  const summary = overviewQuery.data?.summary;

  const columns = useMemo<ColumnsType<ProgressHistoryItem>>(
    () => [
      {
        title: 'Course',
        dataIndex: 'courseTitle',
        key: 'courseTitle',
      },
      {
        title: 'Lesson',
        dataIndex: 'lessonTitle',
        key: 'lessonTitle',
      },
      {
        title: 'Action',
        dataIndex: 'actionType',
        key: 'actionType',
      },
      {
        title: 'Completed',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (value: string) => new Date(value).toLocaleDateString('en-US'),
      },
    ],
    [],
  );

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Student Progress Report"
        subtitle="Summarize completion momentum, weighted progress, and recent study history in one report view."
      >
        {overviewQuery.isLoading ? <Spin tip="Loading student report..." /> : null}

        {summary ? (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12} xl={6}><Card><Statistic title="Enrolled Courses" value={summary.totalCourses} /></Card></Col>
              <Col xs={24} md={12} xl={6}><Card><Statistic title="Completed Courses" value={summary.completedCourses} /></Card></Col>
              <Col xs={24} md={12} xl={6}><Card><Statistic title="Active Courses" value={summary.activeCourses} /></Card></Col>
              <Col xs={24} md={12} xl={6}><Card><Statistic title="Overall Progress" value={summary.overallProgress} suffix="%" /></Card></Col>
            </Row>

            <Card style={{ marginTop: 16 }}>
              <Typography.Title level={4}>Recent Progress Activity</Typography.Title>
              <Table
                rowKey="id"
                columns={columns}
                dataSource={historyQuery.data?.items ?? []}
                loading={historyQuery.isLoading}
                pagination={false}
              />
            </Card>
          </>
        ) : (
          <Empty description="Student progress data is not available yet." />
        )}
      </ClientPageContainer>
    </ClientLayout>
  );
}
