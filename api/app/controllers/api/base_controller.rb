module Api
  class BaseController < ApplicationController
    before_action :verify_browser_request
    before_action :no_store
    rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
    rescue_from ActionController::ParameterMissing, with: :render_bad_request

    private

    def verify_browser_request
      return if request.get? || request.head?
      return if request.headers["Origin"].nil? && !cookies.key?(Authentication::SESSION_COOKIE)
      return if request.headers["X-Loopa-Request"] == "1"

      head :forbidden
    end

    def accessible_projects
      Project.where(user: current_user)
    end

    def project_summary(project)
      { id: project.id, title: project.title, updated_at: project.updated_at }
    end

    def project_details(project)
      project_summary(project).merge(shared_details(project), share_token: project.share_token)
    end

    def shared_details(project)
      {
        title: project.title,
        data: project.data,
        samples: project.samples_attachments.map { |attachment| sample_details(attachment.blob) }
      }
    end

    def sample_details(blob)
      { id: blob.key, url: rails_blob_path(blob) }
    end

    def render_invalid(project)
      render json: { errors: project.errors.to_hash }, status: :unprocessable_content
    end

    def render_not_found
      render json: { error: "Project not found" }, status: :not_found
    end

    def render_bad_request(error)
      render json: { error: error.message }, status: :bad_request
    end
  end
end
