// Public interface of the comments feature. Other features and the app
// shell import from here only — never from files inside this folder.
export { CommentThread } from './CommentThread'
export {
  fetchComments,
  postComment,
  updateComment,
  deleteComment,
  COMMENT_TYPES,
} from './api'
export type { CommentItem, CommentType } from './api'
