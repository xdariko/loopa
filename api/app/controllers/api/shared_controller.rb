module Api
  class SharedController < BaseController
    before_action :require_account, only: :copy

    def show
      render json: shared_details(shared_project)
    end

    def copy
      project = CopyProject.call(shared_project, user: current_user)
      render json: project_details(project), status: :created
    end

    private

    def shared_project
      Project.with_attached_samples.find_by!(share_token: params[:token])
    end
  end
end
