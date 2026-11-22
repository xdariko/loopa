module Api
  class SamplesController < BaseController
    before_action :require_account

    def create
      project = accessible_projects.find(params[:project_id])
      blob = project.add_sample(params[:file])
      if blob
        render json: sample_details(blob), status: :created
      else
        render_invalid(project)
      end
    end
  end
end
