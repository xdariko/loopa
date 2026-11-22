module Api
  class SessionsController < BaseController
    rate_limit to: 10, within: 3.minutes, only: :create, store: Rails.cache

    def show
      render json: { email: current_user&.email }
    end

    def create
      credentials = params.permit(:email, :password)
      user = User.authenticate_by(email: credentials[:email].to_s, password: credentials[:password].to_s)
      if user
        start_new_session_for(user)
        render json: { email: user.email }
      else
        render json: { error: "Invalid email or password" }, status: :unauthorized
      end
    end

    def destroy
      terminate_session
      head :no_content
    end
  end
end
