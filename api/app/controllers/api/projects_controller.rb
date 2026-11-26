module Api
  class ProjectsController < BaseController
    before_action :require_account
    wrap_parameters false

    def index
      projects = accessible_projects.select(:id, :title, :updated_at).order(updated_at: :desc, id: :desc)
      render json: projects.map { |project| project_summary(project) }
    end

    def create
      project = accessible_projects.new(project_attributes)
      if project.save
        render json: project_details(project), status: :created
      else
        render_invalid(project)
      end
    end

    def show
      project = accessible_projects.with_attached_samples.find(params[:id])
      render json: project_details(project)
    end

    def update
      project = accessible_projects.with_attached_samples.find(params[:id])
      if project.update(project_attributes)
        render json: project_details(project)
      else
        render_invalid(project)
      end
    end

    def destroy
      accessible_projects.find(params[:id]).destroy!
      head :no_content
    end

    private

    def project_attributes
      project = params.require(:project)
      unless project.is_a?(ActionController::Parameters)
        raise ActionController::ParameterMissing, :project
      end

      permitted = project.permit(:title, data: {}).to_h
      permitted[:data] = nil if project.key?(:data) && !permitted.key?(:data)

      if project.key?(:data) && request.content_mime_type == Mime[:json] && request.raw_post.present?
        # Rails removes null array entries from params, but they represent empty bars.
        body = ActiveSupport::JSON.decode(request.raw_post)
        body_project = body["project"] if body.is_a?(Hash)
        if body_project.is_a?(Hash) && body_project.key?("data")
          document = body_project["data"]
          permitted[:data] = document.is_a?(Hash) ? document : nil
        end
      end
      permitted
    end
  end
end
