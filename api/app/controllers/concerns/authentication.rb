module Authentication
  extend ActiveSupport::Concern

  SESSION_COOKIE = :loopa_session
  SESSION_DURATION = 14.days

  private

  def resume_session
    if id = cookies.signed[SESSION_COOKIE]
      Current.session ||= Session.where(created_at: SESSION_DURATION.ago..).find_by(id: id)
    end
  end

  def current_user
    resume_session
    Current.user
  end

  def start_new_session_for(user)
    terminate_session
    Current.session = user.sessions.create!
    cookies.signed[SESSION_COOKIE] = {
      value: Current.session.id, expires: SESSION_DURATION.from_now, httponly: true,
      same_site: :lax, secure: Rails.env.production?
    }
  end

  def terminate_session
    resume_session&.destroy!
    clear_session
  end

  def clear_session
    Current.session = nil
    cookies.delete(SESSION_COOKIE)
  end
end
