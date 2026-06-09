-- Performance indexes for common LMS read paths.
-- Non-destructive: adds indexes only.

CREATE INDEX "courses_status_deletedAt_createdAt_idx" ON "courses"("status", "deletedAt", "createdAt");
CREATE INDEX "courses_instructorId_status_deletedAt_idx" ON "courses"("instructorId", "status", "deletedAt");

CREATE INDEX "course_modules_courseId_orderIndex_idx" ON "course_modules"("courseId", "orderIndex");

CREATE INDEX "lessons_moduleId_isPublished_deletedAt_orderIndex_idx" ON "lessons"("moduleId", "isPublished", "deletedAt", "orderIndex");

CREATE INDEX "lesson_materials_lessonId_createdAt_idx" ON "lesson_materials"("lessonId", "createdAt");

CREATE INDEX "enrollments_studentId_status_idx" ON "enrollments"("studentId", "status");
CREATE INDEX "enrollments_courseId_status_idx" ON "enrollments"("courseId", "status");

CREATE INDEX "quizzes_courseId_isPublished_createdAt_idx" ON "quizzes"("courseId", "isPublished", "createdAt");

CREATE INDEX "quiz_attempts_quizId_studentId_createdAt_idx" ON "quiz_attempts"("quizId", "studentId", "createdAt");
CREATE INDEX "quiz_attempts_studentId_createdAt_idx" ON "quiz_attempts"("studentId", "createdAt");

CREATE INDEX "assignments_courseId_deletedAt_dueDate_idx" ON "assignments"("courseId", "deletedAt", "dueDate");
CREATE INDEX "assignments_createdBy_deletedAt_dueDate_idx" ON "assignments"("createdBy", "deletedAt", "dueDate");

CREATE INDEX "submissions_assignmentId_status_idx" ON "submissions"("assignmentId", "status");
CREATE INDEX "submissions_studentId_status_submittedAt_idx" ON "submissions"("studentId", "status", "submittedAt");

CREATE INDEX "chat_room_members_userId_idx" ON "chat_room_members"("userId");

CREATE INDEX "chat_messages_roomId_createdAt_idx" ON "chat_messages"("roomId", "createdAt");
CREATE INDEX "chat_messages_senderId_createdAt_idx" ON "chat_messages"("senderId", "createdAt");

CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");
CREATE INDEX "notifications_courseId_createdAt_idx" ON "notifications"("courseId", "createdAt");
