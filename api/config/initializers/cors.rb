if Rails.env.local?
  Rails.application.config.middleware.insert_before 0, Rack::Cors do
    allow do
      origins "http://127.0.0.1:5173", "http://localhost:5173"

      resource "/api/*", headers: :any, methods: %i[get post patch delete options head]
      resource "/rails/active_storage/*", headers: :any, methods: %i[get options head]
    end
  end
end
