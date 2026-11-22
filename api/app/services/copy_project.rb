class CopyProject
  def self.call(source)
    Project.transaction do
      copy = Project.new(title: source.title, data: source.data)
      copy.samples.attach(source.samples_attachments.map(&:blob))
      copy.save!
      copy
    end
  end
end
