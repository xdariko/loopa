module Api
  class RegistrationsController < BaseController
    rate_limit to: 10, within: 3.minutes, only: :create, store: Rails.cache

    def create
      user = User.new(params.permit(:email, :password, :password_confirmation))
      if user.save
        start_new_session_for(user)
        render json: { email: user.email }, status: :created
      else
        render_invalid(user)
      end
    rescue ActiveRecord::RecordNotUnique
      render json: { errors: { email: ["has already been taken"] } }, status: :unprocessable_content
    end
  end
end
